// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

import { IEAS, Attestation, AttestationRequest, AttestationRequestData, RevocationRequest, RevocationRequestData } from "@ethereum-attestation-service/eas-contracts/contracts/IEAS.sol";
import { SchemaRegistry, ISchemaRegistry, SchemaRecord } from "@ethereum-attestation-service/eas-contracts/contracts/SchemaRegistry.sol";
import { SchemaResolver } from "@ethereum-attestation-service/eas-contracts/contracts/resolver/SchemaResolver.sol";
import { NO_EXPIRATION_TIME, EMPTY_UID } from "@ethereum-attestation-service/eas-contracts/contracts/Common.sol";


contract CookieJar is AccessControl, SchemaResolver {
    /* --------------------- EAS specific code begin --------------------- */
    address private immutable resolverAddress;
    bytes32 public withdrawEasSchema;
    bytes32 public depositEasSchema;
    bytes32 public voteEasSchema;
    string private constant withdrawSchema = "(address dao_member, uint256 withdraw_id, uint256 amount, string note)";
    string private constant depositSchema = "(address dao_member, uint256 deposit_id, uint256 amount, string note)";
    string private constant voteSchema = "(address dao_member, bool is_upvote)";

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

    function onAttest(Attestation calldata attestation, uint256 /*value*/) internal override view returns (bool) {
        return attestation.attester == address(this);
    }

    function onRevoke(Attestation calldata attestation, uint256 /*value*/) internal override view returns (bool) {
        return attestation.attester == address(this);
    }
    /* --------------------- EAS specific code end --------------------- */


    bytes32 public constant DAO_MEMBER_ROLE = keccak256("DAO_MEMBER_ROLE");

    ERC20 public usdToken; // base mainnet USDC address 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
    address private immutable _usdTokenAddress = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address private immutable _easAddress = 0x4200000000000000000000000000000000000021;
    uint256 public withdrawalLimit; // default is 100 USD
    uint256 public cooldownPeriod; // use 28800 for 8 hours


    Withdrawal[] public withdrawals;
    Deposit[] public deposits;
    mapping(address => uint256) public lastWithdrawalTime;
    mapping(address => mapping(uint256 => Vote)) public lastVote;

    event WithdrawalMade(address indexed user, uint256 amount, string note, uint256 withdrawalId, bytes32 attestUid);
    event DepositMade(address indexed user, uint256 amount, string note, uint256 depositId, bytes32 attestUid);
    event Voted(address indexed voter, uint256 withdrawalId, bool isUpvote, bytes32 attestUid);
    event VoteRemoved(address indexed voter, uint256 withdrawalId, bytes32 attestUid);

    // constructor(
    //     address _usdToken,
    //     uint256 _withdrawalLimit,
    //     uint256 _minDeposit,
    //     uint256 _cooldownPeriod,
    //     IEAS eas
    // ) {
    //     require(_usdToken != address(0), "Usd token address cannot be zero");

    //     usdToken = ERC20(_usdToken);
    //     withdrawalLimit = _withdrawalLimit;
    //     cooldownPeriod = _cooldownPeriod;
    //     address _initialAdmin = msg.sender;

    //     _grantRole(DEFAULT_ADMIN_ROLE, _initialAdmin);
    //     _grantRole(DAO_MEMBER_ROLE, _initialAdmin);
    // }

    constructor(
    ) SchemaResolver(IEAS(_easAddress)) {
        // require(_usdToken != address(0), "Usd token address cannot be zero");

        // require(_withdrawEasSchema != bytes32(0), "Withdraw EAS schema cannot be zero");
        // require(_depositEasSchema != bytes32(0), "Deposit EAS schema cannot be zero");
        // require(_depositEasSchema != bytes32(0), "Withdraw and Deposit EAS schema cannot be equal");
        // withdrawEasSchema = _withdrawEasSchema;
        // depositEasSchema = _depositEasSchema;


        resolverAddress = address(this);
        ISchemaRegistry schemaRegistry = _eas.getSchemaRegistry();
        withdrawEasSchema = schemaRegistry.register(withdrawSchema, this, false);
        depositEasSchema = schemaRegistry.register(depositSchema, this, false);
        voteEasSchema = schemaRegistry.register(voteSchema, this, true);

        usdToken = ERC20(_usdTokenAddress);
        withdrawalLimit = 100;
        cooldownPeriod = 28800;

        address _initialAdmin = msg.sender;
        _grantRole(DEFAULT_ADMIN_ROLE, _initialAdmin);
        _grantRole(DAO_MEMBER_ROLE, _initialAdmin);
    }

    // TODO: Implement Pyth price feeds to specify amount in USD
    function withdrawNative(uint256 _amount, string memory _note) external onlyRole(DAO_MEMBER_ROLE) {
        // require(block.timestamp >= lastWithdrawalTime[msg.sender] + cooldownPeriod, "Cooldown period not elapsed");
        // require(_amount <= withdrawalLimit, "Amount exceeds withdrawal limit");

        uint256 nativeBalance = address(this).balance;
        require(nativeBalance >= _amount, "Insufficient funds in the jar");

        payable(msg.sender).transfer(_amount);

        bytes32 withdrawAttestUid = _eas.attest(
            AttestationRequest({
                schema: withdrawEasSchema,
                data: AttestationRequestData({
                    recipient: address(this), // Cookie Jar itself is recepient
                    expirationTime: NO_EXPIRATION_TIME, // No expiration time
                    revocable: false,
                    refUID: EMPTY_UID, // No references UI
                    data: abi.encode(msg.sender, withdrawals.length, _amount, _note),
                    value: 0 // No value/ETH
                })
            })
        );

        lastWithdrawalTime[msg.sender] = block.timestamp;
        withdrawals.push(Withdrawal(msg.sender, _amount, _note, block.timestamp, 0, withdrawAttestUid));
        
        emit WithdrawalMade(msg.sender, _amount, _note, withdrawals.length - 1, withdrawAttestUid);
    }

    // TODO: Implement Pyth price feeds to specify amount in USD, add uint256 _amount parameter
    function depositNative(string memory _note) external payable onlyRole(DAO_MEMBER_ROLE) {
        require(msg.value > 0, "Amount must be greater than 0");

        uint256 _amount = msg.value;
        // // Refund excess ETH if any
        // if (_amount > amountEth) {
        //     payable(msg.sender).transfer(msg.value - amountEth);
        // }

        deposits.push(Deposit(msg.sender, _amount, _note, block.timestamp));

        bytes32 depositAttestUid = _eas.attest(
            AttestationRequest({
                schema: depositEasSchema,
                data: AttestationRequestData({
                    recipient: address(this), // Cookie Jar itself is recepient
                    expirationTime: NO_EXPIRATION_TIME, // No expiration time
                    revocable: false,
                    refUID: EMPTY_UID, // No references UI
                    data: abi.encode(msg.sender, deposits.length - 1, _amount, _note),
                    value: 0 // No value/ETH
                })
            })
        );
        
        emit DepositMade(msg.sender, _amount, _note, deposits.length - 1, depositAttestUid);
    }

    // function withdrawUsd(uint256 _amount, string memory _note) external onlyRole(DAO_MEMBER_ROLE) {
    //     require(_amount <= withdrawalLimit, "Amount exceeds withdrawal limit");
    //     require(block.timestamp >= lastWithdrawalTime[msg.sender] + cooldownPeriod, "Cooldown period not elapsed");
    //     require(usdToken.balanceOf(address(this)) >= _amount * 10** usdToken.decimals, "Insufficient funds in the jar");

    //     lastWithdrawalTime[msg.sender] = block.timestamp;
    //     withdrawals.push(Withdrawal(msg.sender, _amount, _note, block.timestamp, 0));
        
    //     require(token.transfer(msg.sender, _amount), "Transfer failed");
        
    //     emit WithdrawalMade(msg.sender, _amount, _note, withdrawals.length - 1);
    // }

    // function withdrawUsd(uint256 _amount, string memory _note) external onlyRole(DAO_MEMBER_ROLE) {
    //     require(_amount <= withdrawalLimit, "Amount exceeds withdrawal limit");
    //     require(block.timestamp >= lastWithdrawalTime[msg.sender] + cooldownPeriod, "Cooldown period not elapsed");
    //     require(usdToken.balanceOf(address(this)) >= _amount * 10** usdToken.decimals, "Insufficient funds in the jar");

    //     lastWithdrawalTime[msg.sender] = block.timestamp;
    //     withdrawals.push(Withdrawal(msg.sender, _amount, _note, block.timestamp, 0));
        
    //     require(token.transfer(msg.sender, _amount), "Transfer failed");
        
    //     emit WithdrawalMade(msg.sender, _amount, _note, withdrawals.length - 1);
    // }

    function voteOnWithdraw(uint256 _withdrawalId, bool _isUpvote) external onlyRole(DAO_MEMBER_ROLE) {
        require(_withdrawalId < withdrawals.length, "Invalid withdrawal ID");

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
                        value: 0 // No value/ETH
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
                    recipient: address(this), // Cookie Jar itself is recepient
                    expirationTime: NO_EXPIRATION_TIME, // No expiration time
                    revocable: true,
                    refUID: withdrawals[_withdrawalId].uid,
                    data: abi.encode(msg.sender, _isUpvote),
                    value: 0 // No value/ETH
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

    function emergencyWithdrawUsd() external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 balance = usdToken.balanceOf(address(this));
        require(usdToken.transfer(msg.sender, balance), "Transfer failed");
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
        return withdrawals.length;
    }

    function usdTokenDecimals() external view returns (uint8) {
        return usdToken.decimals();
    }

    function getResolvedAddress() external view returns (address) {
        return resolverAddress;
    }

    function getWithdrawEasSchema() external view returns (bytes32) {
        return withdrawEasSchema;
    }

    function getVoteSchema() external view returns (SchemaRecord memory) {
        ISchemaRegistry schemaRegistry = _eas.getSchemaRegistry();
        return schemaRegistry.getSchema(voteEasSchema);
    }
    /* --------------------- Read functions end --------------------- */
}
