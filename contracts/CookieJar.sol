// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";

import { IEAS, Attestation, AttestationRequest, AttestationRequestData, RevocationRequest, RevocationRequestData } from "@ethereum-attestation-service/eas-contracts/contracts/IEAS.sol";
import { SchemaRegistry, ISchemaRegistry, SchemaRecord } from "@ethereum-attestation-service/eas-contracts/contracts/SchemaRegistry.sol";
import { SchemaResolver } from "@ethereum-attestation-service/eas-contracts/contracts/resolver/SchemaResolver.sol";
import { NO_EXPIRATION_TIME, EMPTY_UID } from "@ethereum-attestation-service/eas-contracts/contracts/Common.sol";


contract CookieJar is AccessControl, SchemaResolver {
    /* --------------------- EAS specific code begin --------------------- */
    bytes32 public withdrawEasSchema;
    bytes32 public depositEasSchema;
    bytes32 public voteEasSchema;
    // ~ Delegated Attestations was an option but they are harder to implement. Let's just include who truly attested in an attestation itself. ~
    string private constant withdrawSchema = "(address dao_member, uint256 withdraw_id, uint256 amount, string note)";
    string private constant depositSchema = "(address dao_member, uint256 deposit_id, uint256 amount, string note)";
    string private constant voteSchema = "(address dao_member, bool is_upvote)";

    // ~ DAO members only attestation. ~
    function onAttest(Attestation calldata attestation, uint256 /*value*/) internal override view returns (bool) {
        return attestation.attester == address(this);
    }

    function onRevoke(Attestation calldata attestation, uint256 /*value*/) internal override view returns (bool) {
        return attestation.attester == address(this);
    }
    /* --------------------- EAS specific code end --------------------- */


    bytes32 public constant DAO_MEMBER_ROLE = keccak256("DAO_MEMBER_ROLE");

    // ERC20 public usdToken; // base mainnet USDC address 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
    // address private constant _easAddress = 0x4200000000000000000000000000000000000021;

    // address private constant _pythAddress = 0xA2aa501b19aff244D90cc15a4Cf739D2725B5729; // base sepolia Pyth address, 0xDd24F84d36BF92C65F92307595335bdFab5Bbd21 // optimism goerli
    // bytes32 private constant priceFeedId = 0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace; // ETH/USD
    IPyth pyth;

    string public name;
    string public description;
    uint256 public withdrawalLimit; // in human units, default is 100, means one hundred USD
    uint256 public cooldownPeriod; // in seconds, use 28800 for 8 hours
    bytes32 public priceFeedId; // Pyth price feed id

    struct Withdrawal {
        address user;
        uint256 amount;
        string note;
        uint256 timestamp;
        int256 votes;
        bytes32 uid; // attestation uid
    }

    struct Deposit {
        address user;
        uint256 amount;
        string note;
        uint256 timestamp;
    }

    struct Vote {
        bytes32 uid; // attestation uid
        bool isUpvote;
    }

    Withdrawal[] public withdrawals;
    Deposit[] public deposits;
    mapping(address => uint256) public lastWithdrawalTime;
    mapping(address => mapping(uint256 => Vote)) public lastVote;

    event WithdrawalMade(address indexed user, uint256 amount, string note, uint256 withdrawalId, bytes32 attestUid);
    event DepositMade(address indexed user, uint256 amount, string note, uint256 depositId, bytes32 attestUid);
    event Voted(address indexed voter, uint256 withdrawalId, bool isUpvote, bytes32 attestUid);
    event VoteRemoved(address indexed voter, uint256 withdrawalId, bytes32 attestUid);


    constructor(
        string memory _name,
        string memory _description,
        uint256 _withdrawalLimit,
        uint256 _cooldownPeriod,
        address _easAddress,
        address _pythAddress,
        bytes32 _priceFeedId
    ) SchemaResolver(IEAS(_easAddress)) {

        // ~Register new schemes because the EAS resolver is contract itself.~
        ISchemaRegistry schemaRegistry = _eas.getSchemaRegistry();
        withdrawEasSchema = schemaRegistry.register(withdrawSchema, this, false);
        depositEasSchema = schemaRegistry.register(depositSchema, this, false);
        voteEasSchema = schemaRegistry.register(voteSchema, this, true);

        pyth = IPyth(_pythAddress);
        priceFeedId = _priceFeedId;

        name = _name;
        description = _description;
        withdrawalLimit = _withdrawalLimit;
        cooldownPeriod = _cooldownPeriod;

        address _initialAdmin = msg.sender;
        _grantRole(DEFAULT_ADMIN_ROLE, _initialAdmin);
        _grantRole(DAO_MEMBER_ROLE, _initialAdmin);
    }

    // amount - number in human units, e.g 1 means 1 USD, 10 means 10 USD etc.
    function deposit(uint256 _amount, string memory _note, bytes[] calldata priceUpdate) external payable onlyRole(DAO_MEMBER_ROLE) {
        require(msg.value > 0, "Amount must be greater than 0");

        uint fee = pyth.getUpdateFee(priceUpdate);
        // Update price feeds using the contract's balance
        (bool success1, ) = address(pyth).call{value: fee}(
            abi.encodeWithSignature("updatePriceFeeds(bytes[])", priceUpdate)
        );
        require(success1, "Price feed update failed");

        PythStructs.Price memory priceData = pyth.getPrice(priceFeedId);

        require(priceData.price > 0, "Invalid native token/USD price");

        uint256 nativeTokenPrice = uint256(int256(priceData.price));
        uint256 amountNative = _amount * 1e26 / nativeTokenPrice;

        require(msg.value >= amountNative, "Insufficient funds in msg.value");

        // Refund excess native token if any
        if (msg.value > amountNative) {
            payable(msg.sender).transfer(msg.value - amountNative);
        }

        bytes memory encodedData = abi.encode(msg.sender, deposits.length, _amount, _note);
        bytes32 depositAttestUid = _eas.attest(
            AttestationRequest({
                schema: depositEasSchema,
                data: AttestationRequestData({
                    recipient: address(this), // Cookie Jar itself is recipient
                    expirationTime: NO_EXPIRATION_TIME, // No expiration time
                    revocable: false,
                    refUID: EMPTY_UID, // No references UI
                    data: encodedData,
                    value: 0 // No value
                })
            })
        );

        deposits.push(Deposit(msg.sender, _amount, _note, block.timestamp));
        
        emit DepositMade(msg.sender, _amount, _note, deposits.length - 1, depositAttestUid);
    }

    // amount - number in human units, e.g 1 means 1 USD, 10 means 10 USD etc.
    function withdraw(uint256 _amount, string memory _note, bytes[] calldata priceUpdate) external onlyRole(DAO_MEMBER_ROLE) {
        require(block.timestamp >= lastWithdrawalTime[msg.sender] + cooldownPeriod, "Cooldown period not elapsed, please try again later");
        require(_amount <= withdrawalLimit, "Amount exceeds withdrawal limit");
        require(_amount > 0, "Amount must be greater than 0");

        uint fee = pyth.getUpdateFee(priceUpdate);
        // ~ Update price feeds using the contract's balance ~
        (bool success, ) = address(pyth).call{value: fee}(
            abi.encodeWithSignature("updatePriceFeeds(bytes[])", priceUpdate)
        );
        require(success, "Price feed update failed");
        // pyth.updatePriceFeeds{ value: fee }(priceUpdate);
        PythStructs.Price memory priceData = pyth.getPrice(priceFeedId);

        require(priceData.price > 0, "Invalid native token/USD price");

        uint256 nativePrice = uint256(int256(priceData.price));
        uint256 amountNative = _amount * 1e26 / nativePrice;

        uint256 nativeBalance = address(this).balance;
        require(nativeBalance >= amountNative, "Insufficient funds in the jar");

        // Refund excess native token back to contract if any
        payable(msg.sender).transfer(amountNative);

        bytes memory encodedData = abi.encode(msg.sender, withdrawals.length, _amount, _note);
        bytes32 withdrawAttestUid = _eas.attest(
            AttestationRequest({
                schema: withdrawEasSchema,
                data: AttestationRequestData({
                    recipient: address(this), // Cookie Jar itself is recipient
                    expirationTime: NO_EXPIRATION_TIME, // No expiration time
                    revocable: false,
                    refUID: EMPTY_UID, // No references UI
                    data: encodedData,
                    value: 0 // No value
                })
            })
        );

        lastWithdrawalTime[msg.sender] = block.timestamp;
        withdrawals.push(Withdrawal(msg.sender, _amount, _note, block.timestamp, 0, withdrawAttestUid));
        
        emit WithdrawalMade(msg.sender, _amount, _note, withdrawals.length - 1, withdrawAttestUid);
    }

    // every dao member has right to vote on 
    function voteOnWithdraw(uint256 _withdrawalId, bool _isUpvote) external onlyRole(DAO_MEMBER_ROLE) {
        require(_withdrawalId < withdrawals.length, "Invalid withdrawal ID");

        // ~ Remove last vote if exist ~
        if (lastVote[msg.sender][_withdrawalId].uid != bytes32(0)) {
            Vote memory _lastVote = lastVote[msg.sender][_withdrawalId];
            require(_lastVote.isUpvote != _isUpvote, "Same vote again");

            if (_lastVote.isUpvote) {
                withdrawals[_withdrawalId].votes -= 1;
            } else {
                withdrawals[_withdrawalId].votes += 1;
            }

            _eas.revoke(
                RevocationRequest({
                    schema: voteEasSchema,
                    data: RevocationRequestData({
                        uid: _lastVote.uid,
                        value: 0 // No value
                    })
                })
            );

            emit VoteRemoved(msg.sender, _withdrawalId, _lastVote.uid);
        }

        if (_isUpvote) {
            withdrawals[_withdrawalId].votes += 1;
        } else {
            withdrawals[_withdrawalId].votes -= 1;
        }

        bytes32 voteAttestUid = _eas.attest(
            AttestationRequest({
                schema: voteEasSchema,
                data: AttestationRequestData({
                    recipient: address(this), // Cookie Jar itself is recipient
                    expirationTime: NO_EXPIRATION_TIME, // No expiration time
                    revocable: true,
                    refUID: withdrawals[_withdrawalId].uid,
                    data: abi.encode(msg.sender, _isUpvote),
                    value: 0 // No value
                })
            })
        );

        lastVote[msg.sender][_withdrawalId] = Vote(voteAttestUid, _isUpvote);

        emit Voted(msg.sender, _withdrawalId, _isUpvote, voteAttestUid);
    }



    /* --------------------- Admin functions begin --------------------- */
    function setWithdrawalLimit(uint256 _newLimit) external onlyRole(DEFAULT_ADMIN_ROLE) {
        withdrawalLimit = _newLimit;
    }

    function setCooldownPeriod(uint256 _newPeriod) external onlyRole(DEFAULT_ADMIN_ROLE) {
        cooldownPeriod = _newPeriod;
    }

    function emergencyWithdrawNative() external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 _balance = address(this).balance;
        payable(msg.sender).transfer(_balance);
    }

        /* --------------------- Membership functions begin --------------------- */

    function addDAOMember(address _newMember) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(DAO_MEMBER_ROLE, _newMember);
    }

    function removeDAOMember(address _member) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(DAO_MEMBER_ROLE, _member);
    }

    function addAdmin(address _admin) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(DEFAULT_ADMIN_ROLE, _admin);
    }

    function removeAdmin(address _admin) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(DEFAULT_ADMIN_ROLE, _admin);
    }
        /* --------------------- Membership functions end --------------------- */

    /* --------------------- Admin functions end --------------------- */


    /* --------------------- Read functions begin --------------------- */
    function getWithdrawalsCount() external view returns (uint256) {
        return withdrawals.length;
    }

    function getDepositsCount() external view returns (uint256) {
        return deposits.length;
    }
    /* --------------------- Read functions end --------------------- */
}