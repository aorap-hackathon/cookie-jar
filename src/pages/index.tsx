import { ConnectButton } from '@rainbow-me/rainbowkit';
import type { NextPage } from 'next';
import Head from 'next/head';
import styles from '../styles/Home.module.css';
import { useEffect, useState } from 'react';
import Modal from 'react-modal';
import {
  useAccount,
  useDeployContract,
  useWaitForTransactionReceipt,
  useChainId,
} from 'wagmi';
import { getBalance } from '@wagmi/core';
import { config } from '../wagmi';

export type Jar = {
  name: string;
  description: string;
  contractAddress: string;
  balance: number;
};

export type Vote = {
  user: string;
  isUpvote: boolean;
};

export type Operation = {
  id: number;
  user: string;
  isDeposit: boolean;
  amount: number;
  note: string;
  score: number;
  votes: Vote[];
};

export const validChainIds = config.chains.map((chain) => chain.id);

export const pythAddress: { [key in (typeof validChainIds)[number]]: string } =
  {
    // 11155111: '0xDd24F84d36BF92C65F92307595335bdFab5Bbd21',      // Ethereum Sepolia
    // 11155420: '0x0708325268dF9F66270F1401206434524814508b',      // Optimism Sepolia
    // 84532: '0xA2aa501b19aff244D90cc15a4Cf739D2725B5729',         // Base Sepolia
    // 44787: '0x74f09cb3c7e2A01865f424FD14F6dc9A14E3e94E',         // Celo Alfajores
    8453: '0x8250f4aF4B972684F7b336503E2D6dFeDeB1487a', // Base
    10: '0xff1a0f4744e8582DF1aE09D5611b887B6a12925C', // Optimism
    42220: '0xff1a0f4744e8582DF1aE09D5611b887B6a12925C', // Celo
    // 1750: '0x0',                                                 // Metal L2 (not available)
    // 34443: '0xA2aa501b19aff244D90cc15a4Cf739D2725B5729',         // Mode
  };

export const priceFeedId: { [key in (typeof validChainIds)[number]]: string } =
  {
    // 11155111: '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',   // Ethereum Sepolia
    // 11155420: '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',   // Optimism Sepolia
    // 84532: '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',      // Base Sepolia
    // 44787: '0x7d669ddcdd23d9ef1fa9a9cc022ba055ec900e91c4cb960f3c20429d4447a411',      // Celo Alfajores
    8453: '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace', // Base
    10: '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace', // Optimism
    42220: '0x7d669ddcdd23d9ef1fa9a9cc022ba055ec900e91c4cb960f3c20429d4447a411', // Celo
    // 1750: '0x7d669ddcdd23d9ef1fa9a9cc022ba055ec900e91c4cb960f3c20429d4447a411',       // Metal L2
    // 34443: '0x7d669ddcdd23d9ef1fa9a9cc022ba055ec900e91c4cb960f3c20429d4447a411',      // Mode
  };

export const easAddress: { [key in (typeof validChainIds)[number]]: string } = {
  // 11155111: '0xC2679fBD37d54388Ce493F1DB75320D236e1815e',   // Ethereum Sepolia
  // 11155420: '0x4200000000000000000000000000000000000021',   // Optimism Sepolia
  // 84532: '0x4200000000000000000000000000000000000021',      // Base Sepolia
  // 44787: '0x0',                                             // Celo Alfajores (not available)
  8453: '0x4200000000000000000000000000000000000021', // Base
  10: '0x4200000000000000000000000000000000000021', // Optimism
  42220: '0x72E1d8ccf5299fb36fEfD8CC4394B8ef7e98Af92', // Celo
  // 1750: '0x0',                                              // Metal L2 (not available)
  // 34443: '0x0',                                             // Mode (not available)
};

export const jarContractAbi = [
  {
    inputs: [
      { internalType: 'string', name: '_name', type: 'string' },
      { internalType: 'string', name: '_description', type: 'string' },
      { internalType: 'uint256', name: '_withdrawalLimit', type: 'uint256' },
      { internalType: 'uint256', name: '_cooldownPeriod', type: 'uint256' },
      { internalType: 'address', name: '_easAddress', type: 'address' },
      { internalType: 'address', name: '_pythAddress', type: 'address' },
      { internalType: 'bytes32', name: '_priceFeedId', type: 'bytes32' },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  { inputs: [], name: 'AccessControlBadConfirmation', type: 'error' },
  {
    inputs: [
      { internalType: 'address', name: 'account', type: 'address' },
      { internalType: 'bytes32', name: 'neededRole', type: 'bytes32' },
    ],
    name: 'AccessControlUnauthorizedAccount',
    type: 'error',
  },
  { inputs: [], name: 'AccessDenied', type: 'error' },
  { inputs: [], name: 'InsufficientValue', type: 'error' },
  { inputs: [], name: 'InvalidEAS', type: 'error' },
  { inputs: [], name: 'InvalidLength', type: 'error' },
  { inputs: [], name: 'NotPayable', type: 'error' },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'user', type: 'address' },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
      { indexed: false, internalType: 'string', name: 'note', type: 'string' },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'depositId',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'bytes32',
        name: 'attestUid',
        type: 'bytes32',
      },
    ],
    name: 'DepositMade',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'role', type: 'bytes32' },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'previousAdminRole',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'newAdminRole',
        type: 'bytes32',
      },
    ],
    name: 'RoleAdminChanged',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'role', type: 'bytes32' },
      {
        indexed: true,
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'sender',
        type: 'address',
      },
    ],
    name: 'RoleGranted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'role', type: 'bytes32' },
      {
        indexed: true,
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'sender',
        type: 'address',
      },
    ],
    name: 'RoleRevoked',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'voter',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'withdrawalId',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'bytes32',
        name: 'attestUid',
        type: 'bytes32',
      },
    ],
    name: 'VoteRemoved',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'voter',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'withdrawalId',
        type: 'uint256',
      },
      { indexed: false, internalType: 'bool', name: 'isUpvote', type: 'bool' },
      {
        indexed: false,
        internalType: 'bytes32',
        name: 'attestUid',
        type: 'bytes32',
      },
    ],
    name: 'Voted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'user', type: 'address' },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
      { indexed: false, internalType: 'string', name: 'note', type: 'string' },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'withdrawalId',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'bytes32',
        name: 'attestUid',
        type: 'bytes32',
      },
    ],
    name: 'WithdrawalMade',
    type: 'event',
  },
  {
    inputs: [],
    name: 'DAO_MEMBER_ROLE',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'DEFAULT_ADMIN_ROLE',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '_admin', type: 'address' }],
    name: 'addAdmin',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '_newMember', type: 'address' }],
    name: 'addDAOMember',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          { internalType: 'bytes32', name: 'uid', type: 'bytes32' },
          { internalType: 'bytes32', name: 'schema', type: 'bytes32' },
          { internalType: 'uint64', name: 'time', type: 'uint64' },
          { internalType: 'uint64', name: 'expirationTime', type: 'uint64' },
          { internalType: 'uint64', name: 'revocationTime', type: 'uint64' },
          { internalType: 'bytes32', name: 'refUID', type: 'bytes32' },
          { internalType: 'address', name: 'recipient', type: 'address' },
          { internalType: 'address', name: 'attester', type: 'address' },
          { internalType: 'bool', name: 'revocable', type: 'bool' },
          { internalType: 'bytes', name: 'data', type: 'bytes' },
        ],
        internalType: 'struct Attestation',
        name: 'attestation',
        type: 'tuple',
      },
    ],
    name: 'attest',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'cooldownPeriod',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: '_amount', type: 'uint256' },
      { internalType: 'string', name: '_note', type: 'string' },
      { internalType: 'bytes[]', name: 'priceUpdate', type: 'bytes[]' },
    ],
    name: 'deposit',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'depositEasSchema',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'deposits',
    outputs: [
      { internalType: 'address', name: 'user', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'string', name: 'note', type: 'string' },
      { internalType: 'uint256', name: 'timestamp', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'description',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'emergencyWithdrawNative',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getDepositsCount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'role', type: 'bytes32' }],
    name: 'getRoleAdmin',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getWithdrawalsCount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'role', type: 'bytes32' },
      { internalType: 'address', name: 'account', type: 'address' },
    ],
    name: 'grantRole',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'role', type: 'bytes32' },
      { internalType: 'address', name: 'account', type: 'address' },
    ],
    name: 'hasRole',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '_admin', type: 'address' }],
    name: 'isAdmin',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '_member', type: 'address' }],
    name: 'isDAOMember',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'isPayable',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'uint256', name: '', type: 'uint256' },
    ],
    name: 'lastVote',
    outputs: [
      { internalType: 'bytes32', name: 'uid', type: 'bytes32' },
      { internalType: 'bool', name: 'isUpvote', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'lastWithdrawalTime',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          { internalType: 'bytes32', name: 'uid', type: 'bytes32' },
          { internalType: 'bytes32', name: 'schema', type: 'bytes32' },
          { internalType: 'uint64', name: 'time', type: 'uint64' },
          { internalType: 'uint64', name: 'expirationTime', type: 'uint64' },
          { internalType: 'uint64', name: 'revocationTime', type: 'uint64' },
          { internalType: 'bytes32', name: 'refUID', type: 'bytes32' },
          { internalType: 'address', name: 'recipient', type: 'address' },
          { internalType: 'address', name: 'attester', type: 'address' },
          { internalType: 'bool', name: 'revocable', type: 'bool' },
          { internalType: 'bytes', name: 'data', type: 'bytes' },
        ],
        internalType: 'struct Attestation[]',
        name: 'attestations',
        type: 'tuple[]',
      },
      { internalType: 'uint256[]', name: 'values', type: 'uint256[]' },
    ],
    name: 'multiAttest',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          { internalType: 'bytes32', name: 'uid', type: 'bytes32' },
          { internalType: 'bytes32', name: 'schema', type: 'bytes32' },
          { internalType: 'uint64', name: 'time', type: 'uint64' },
          { internalType: 'uint64', name: 'expirationTime', type: 'uint64' },
          { internalType: 'uint64', name: 'revocationTime', type: 'uint64' },
          { internalType: 'bytes32', name: 'refUID', type: 'bytes32' },
          { internalType: 'address', name: 'recipient', type: 'address' },
          { internalType: 'address', name: 'attester', type: 'address' },
          { internalType: 'bool', name: 'revocable', type: 'bool' },
          { internalType: 'bytes', name: 'data', type: 'bytes' },
        ],
        internalType: 'struct Attestation[]',
        name: 'attestations',
        type: 'tuple[]',
      },
      { internalType: 'uint256[]', name: 'values', type: 'uint256[]' },
    ],
    name: 'multiRevoke',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'name',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'priceFeedId',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '_admin', type: 'address' }],
    name: 'removeAdmin',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '_member', type: 'address' }],
    name: 'removeDAOMember',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'role', type: 'bytes32' },
      { internalType: 'address', name: 'callerConfirmation', type: 'address' },
    ],
    name: 'renounceRole',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          { internalType: 'bytes32', name: 'uid', type: 'bytes32' },
          { internalType: 'bytes32', name: 'schema', type: 'bytes32' },
          { internalType: 'uint64', name: 'time', type: 'uint64' },
          { internalType: 'uint64', name: 'expirationTime', type: 'uint64' },
          { internalType: 'uint64', name: 'revocationTime', type: 'uint64' },
          { internalType: 'bytes32', name: 'refUID', type: 'bytes32' },
          { internalType: 'address', name: 'recipient', type: 'address' },
          { internalType: 'address', name: 'attester', type: 'address' },
          { internalType: 'bool', name: 'revocable', type: 'bool' },
          { internalType: 'bytes', name: 'data', type: 'bytes' },
        ],
        internalType: 'struct Attestation',
        name: 'attestation',
        type: 'tuple',
      },
    ],
    name: 'revoke',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'role', type: 'bytes32' },
      { internalType: 'address', name: 'account', type: 'address' },
    ],
    name: 'revokeRole',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '_newPeriod', type: 'uint256' }],
    name: 'setCooldownPeriod',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '_newLimit', type: 'uint256' }],
    name: 'setWithdrawalLimit',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes4', name: 'interfaceId', type: 'bytes4' }],
    name: 'supportsInterface',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'version',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'voteEasSchema',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: '_withdrawalId', type: 'uint256' },
      { internalType: 'bool', name: '_isUpvote', type: 'bool' },
    ],
    name: 'voteOnWithdraw',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: '_amount', type: 'uint256' },
      { internalType: 'string', name: '_note', type: 'string' },
      { internalType: 'bytes[]', name: 'priceUpdate', type: 'bytes[]' },
    ],
    name: 'withdraw',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'withdrawEasSchema',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'withdrawalLimit',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'withdrawals',
    outputs: [
      { internalType: 'address', name: 'user', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'string', name: 'note', type: 'string' },
      { internalType: 'uint256', name: 'timestamp', type: 'uint256' },
      { internalType: 'int256', name: 'votes', type: 'int256' },
      { internalType: 'bytes32', name: 'uid', type: 'bytes32' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  { stateMutability: 'payable', type: 'receive' },
];

export const jarContractBytecode =
  '0x61010060405234801561001157600080fd5b5060405161562a38038061562a833981810160405281019061003391906107be565b8260016003600082608081815250508160a081815250508060c08181525050505050600073ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff16036100bb576040517f83780ffe00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b8073ffffffffffffffffffffffffffffffffffffffff1660e08173ffffffffffffffffffffffffffffffffffffffff168152505050600060e05173ffffffffffffffffffffffffffffffffffffffff1663f10b5cc86040518163ffffffff1660e01b8152600401602060405180830381865afa15801561013f573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061016391906108d6565b90508073ffffffffffffffffffffffffffffffffffffffff166360d7a2786040518060800160405280604681526020016155e4604691393060006040518463ffffffff1660e01b81526004016101bb939291906109d2565b6020604051808303816000875af11580156101da573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906101fe9190610a10565b6001819055508073ffffffffffffffffffffffffffffffffffffffff166360d7a27860405180608001604052806045815260200161557b604591393060006040518463ffffffff1660e01b815260040161025a939291906109d2565b6020604051808303816000875af1158015610279573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061029d9190610a10565b6002819055508073ffffffffffffffffffffffffffffffffffffffff166360d7a2786040518060600160405280602481526020016155c0602491393060016040518463ffffffff1660e01b81526004016102f9939291906109d2565b6020604051808303816000875af1158015610318573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061033c9190610a10565b60038190555082600460006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055508160098190555087600590816103999190610c3f565b5086600690816103a99190610c3f565b50856007819055508460088190555060003390506103d06000801b8261041060201b60201c565b506104017ff29a78c020ddf311f61483cfe182d6d833b80b74c6044ef77e24d033c4266a4c8261041060201b60201c565b50505050505050505050610d11565b6000610422838361050d60201b60201c565b61050257600160008085815260200190815260200160002060000160008473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060006101000a81548160ff02191690831515021790555061049f61057760201b60201c565b73ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff16847f2f8788117e7eff1d82e926ec794901d17c78024a50270940304540a733656f0d60405160405180910390a460019050610507565b600090505b92915050565b600080600084815260200190815260200160002060000160008373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060009054906101000a900460ff16905092915050565b600033905090565b6000604051905090565b600080fd5b600080fd5b600080fd5b600080fd5b6000601f19601f8301169050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b6105e68261059d565b810181811067ffffffffffffffff82111715610605576106046105ae565b5b80604052505050565b600061061861057f565b905061062482826105dd565b919050565b600067ffffffffffffffff821115610644576106436105ae565b5b61064d8261059d565b9050602081019050919050565b60005b8381101561067857808201518184015260208101905061065d565b60008484015250505050565b600061069761069284610629565b61060e565b9050828152602081018484840111156106b3576106b2610598565b5b6106be84828561065a565b509392505050565b600082601f8301126106db576106da610593565b5b81516106eb848260208601610684565b91505092915050565b6000819050919050565b610707816106f4565b811461071257600080fd5b50565b600081519050610724816106fe565b92915050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b60006107558261072a565b9050919050565b6107658161074a565b811461077057600080fd5b50565b6000815190506107828161075c565b92915050565b6000819050919050565b61079b81610788565b81146107a657600080fd5b50565b6000815190506107b881610792565b92915050565b600080600080600080600060e0888a0312156107dd576107dc610589565b5b600088015167ffffffffffffffff8111156107fb576107fa61058e565b5b6108078a828b016106c6565b975050602088015167ffffffffffffffff8111156108285761082761058e565b5b6108348a828b016106c6565b96505060406108458a828b01610715565b95505060606108568a828b01610715565b94505060806108678a828b01610773565b93505060a06108788a828b01610773565b92505060c06108898a828b016107a9565b91505092959891949750929550565b60006108a38261074a565b9050919050565b6108b381610898565b81146108be57600080fd5b50565b6000815190506108d0816108aa565b92915050565b6000602082840312156108ec576108eb610589565b5b60006108fa848285016108c1565b91505092915050565b600081519050919050565b600082825260208201905092915050565b600061092a82610903565b610934818561090e565b935061094481856020860161065a565b61094d8161059d565b840191505092915050565b6000819050919050565b600061097d6109786109738461072a565b610958565b61072a565b9050919050565b600061098f82610962565b9050919050565b60006109a182610984565b9050919050565b6109b181610996565b82525050565b60008115159050919050565b6109cc816109b7565b82525050565b600060608201905081810360008301526109ec818661091f565b90506109fb60208301856109a8565b610a0860408301846109c3565b949350505050565b600060208284031215610a2657610a25610589565b5b6000610a34848285016107a9565b91505092915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b60006002820490506001821680610a8457607f821691505b602082108103610a9757610a96610a3d565b5b50919050565b60008190508160005260206000209050919050565b60006020601f8301049050919050565b600082821b905092915050565b600060088302610aff7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff82610ac2565b610b098683610ac2565b95508019841693508086168417925050509392505050565b6000610b3c610b37610b32846106f4565b610958565b6106f4565b9050919050565b6000819050919050565b610b5683610b21565b610b6a610b6282610b43565b848454610acf565b825550505050565b600090565b610b7f610b72565b610b8a818484610b4d565b505050565b5b81811015610bae57610ba3600082610b77565b600181019050610b90565b5050565b601f821115610bf357610bc481610a9d565b610bcd84610ab2565b81016020851015610bdc578190505b610bf0610be885610ab2565b830182610b8f565b50505b505050565b600082821c905092915050565b6000610c1660001984600802610bf8565b1980831691505092915050565b6000610c2f8383610c05565b9150826002028217905092915050565b610c4882610903565b67ffffffffffffffff811115610c6157610c606105ae565b5b610c6b8254610a6c565b610c76828285610bb2565b600060209050601f831160018114610ca95760008415610c97578287015190505b610ca18582610c23565b865550610d09565b601f198416610cb786610a9d565b60005b82811015610cdf57848901518255600182019150602085019450602081019050610cba565b86831015610cfc5784890151610cf8601f891682610c05565b8355505b6001600288020188555050505b505050505050565b60805160a05160c05160e051614815610d6660003960008181610f94015281816114c50152818161165d015281816122100152612b8b015260006119ad015260006119840152600061195b01526148156000f3fe60806040526004361061023f5760003560e01c80637284e4161161012e578063b1e44d8f116100ab578063d6a22d741161006f578063d6a22d74146108e8578063dde0195514610913578063e29e98aa1461093c578063e49617e114610967578063e60c35051461099757610284565b8063b1e44d8f14610803578063c791058d14610840578063ce46e0461461086b578063d547741f14610896578063d686f459146108bf57610284565b8063901614c1116100f2578063901614c11461070257806391d148541461072b57806391db0b7e14610768578063a217fddf14610798578063b02c43d0146107c357610284565b80637284e416146106285780637ddfe78d1461065357806380ea3de11461067e5780638162c0c3146106a757806388e5b2d9146106d257610284565b806327543a9a116101bc5780634de5120e116101805780634de5120e1461052c57806354fd4d50146105695780635a0768ce146105945780635cc07076146105bd57806370480275146105ff57610284565b806327543a9a1461045b5780632e1de285146104865780632f2ff15d146104af57806336568abe146104d85780634c5822e41461050157610284565b80631785f53c116102035780631785f53c1461034f5780631999bb9e1461037857806323618376146103a3578063248a9ca3146103e157806324d7806c1461041e57610284565b806301ffc9a71461028957806304646a49146102c657806306fdde03146102f157806307eb21351461031c578063132531421461033357610284565b366102845761024c6109c7565b610282576040517f1574f9f300000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b005b600080fd5b34801561029557600080fd5b506102b060048036038101906102ab9190612ec3565b6109cc565b6040516102bd9190612f0b565b60405180910390f35b3480156102d257600080fd5b506102db610a46565b6040516102e89190612f3f565b60405180910390f35b3480156102fd57600080fd5b50610306610a4c565b6040516103139190612fea565b60405180910390f35b34801561032857600080fd5b50610331610ada565b005b61034d600480360381019061034891906131cd565b610b37565b005b34801561035b57600080fd5b50610376600480360381019061037191906132bb565b6111e2565b005b34801561038457600080fd5b5061038d611200565b60405161039a9190613301565b60405180910390f35b3480156103af57600080fd5b506103ca60048036038101906103c5919061331c565b611206565b6040516103d892919061335c565b60405180910390f35b3480156103ed57600080fd5b50610408600480360381019061040391906133b1565b611244565b6040516104159190613301565b60405180910390f35b34801561042a57600080fd5b50610445600480360381019061044091906132bb565b611263565b6040516104529190612f0b565b60405180910390f35b34801561046757600080fd5b50610470611279565b60405161047d9190613301565b60405180910390f35b34801561049257600080fd5b506104ad60048036038101906104a8919061340a565b61129d565b005b3480156104bb57600080fd5b506104d660048036038101906104d1919061344a565b611892565b005b3480156104e457600080fd5b506104ff60048036038101906104fa919061344a565b6118b4565b005b34801561050d57600080fd5b5061051661192f565b6040516105239190612f3f565b60405180910390f35b34801561053857600080fd5b50610553600480360381019061054e91906132bb565b61193c565b6040516105609190612f3f565b60405180910390f35b34801561057557600080fd5b5061057e611954565b60405161058b9190612fea565b60405180910390f35b3480156105a057600080fd5b506105bb60048036038101906105b6919061348a565b6119f7565b005b3480156105c957600080fd5b506105e460048036038101906105df919061348a565b611a0f565b6040516105f6969594939291906134df565b60405180910390f35b34801561060b57600080fd5b50610626600480360381019061062191906132bb565b611b03565b005b34801561063457600080fd5b5061063d611b21565b60405161064a9190612fea565b60405180910390f35b34801561065f57600080fd5b50610668611baf565b6040516106759190612f3f565b60405180910390f35b34801561068a57600080fd5b506106a560048036038101906106a0919061348a565b611bb5565b005b3480156106b357600080fd5b506106bc611bcd565b6040516106c99190613301565b60405180910390f35b6106ec60048036038101906106e791906135f3565b611bd3565b6040516106f99190612f0b565b60405180910390f35b34801561070e57600080fd5b50610729600480360381019061072491906131cd565b611cee565b005b34801561073757600080fd5b50610752600480360381019061074d919061344a565b6124c4565b60405161075f9190612f0b565b60405180910390f35b610782600480360381019061077d91906135f3565b61252e565b60405161078f9190612f0b565b60405180910390f35b3480156107a457600080fd5b506107ad612649565b6040516107ba9190613301565b60405180910390f35b3480156107cf57600080fd5b506107ea60048036038101906107e5919061348a565b612650565b6040516107fa9493929190613674565b60405180910390f35b34801561080f57600080fd5b5061082a600480360381019061082591906132bb565b612738565b6040516108379190612f0b565b60405180910390f35b34801561084c57600080fd5b5061085561276b565b6040516108629190613301565b60405180910390f35b34801561087757600080fd5b506108806109c7565b60405161088d9190612f0b565b60405180910390f35b3480156108a257600080fd5b506108bd60048036038101906108b8919061344a565b612771565b005b3480156108cb57600080fd5b506108e660048036038101906108e191906132bb565b612793565b005b3480156108f457600080fd5b506108fd6127ce565b60405161090a9190613301565b60405180910390f35b34801561091f57600080fd5b5061093a600480360381019061093591906132bb565b6127d4565b005b34801561094857600080fd5b5061095161280f565b60405161095e9190612f3f565b60405180910390f35b610981600480360381019061097c91906136e5565b61281c565b60405161098e9190612f0b565b60405180910390f35b6109b160048036038101906109ac91906136e5565b612837565b6040516109be9190612f0b565b60405180910390f35b600090565b60007f7965db0b000000000000000000000000000000000000000000000000000000007bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916827bffffffffffffffffffffffffffffffffffffffffffffffffffffffff19161480610a3f5750610a3e82612852565b5b9050919050565b60085481565b60058054610a599061375d565b80601f0160208091040260200160405190810160405280929190818152602001828054610a859061375d565b8015610ad25780601f10610aa757610100808354040283529160200191610ad2565b820191906000526020600020905b815481529060010190602001808311610ab557829003601f168201915b505050505081565b6000801b610ae7816128bc565b60004790503373ffffffffffffffffffffffffffffffffffffffff166108fc829081150290604051600060405180830381858888f19350505050158015610b32573d6000803e3d6000fd5b505050565b7ff29a78c020ddf311f61483cfe182d6d833b80b74c6044ef77e24d033c4266a4c610b61816128bc565b60003411610ba4576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610b9b906137da565b60405180910390fd5b6000600460009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1663d47eed4585856040518363ffffffff1660e01b8152600401610c0392919061395e565b602060405180830381865afa158015610c20573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190610c449190613997565b90506000600460009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16828686604051602401610c9592919061395e565b6040516020818303038152906040527fef9e5e28000000000000000000000000000000000000000000000000000000007bffffffffffffffffffffffffffffffffffffffffffffffffffffffff19166020820180517bffffffffffffffffffffffffffffffffffffffffffffffffffffffff8381831617835250505050604051610d1f9190613a0b565b60006040518083038185875af1925050503d8060008114610d5c576040519150601f19603f3d011682016040523d82523d6000602084013e610d61565b606091505b5050905080610da5576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610d9c90613a6e565b60405180910390fd5b6000600460009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166396834ad36009546040518263ffffffff1660e01b8152600401610e049190613301565b608060405180830381865afa158015610e21573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190610e459190613bbd565b90506000816000015160070b13610e91576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610e8890613c36565b60405180910390fd5b6000816000015160070b90506000816a52b7d2dcc80cd2e40000008b610eb79190613c85565b610ec19190613cf6565b905080341015610f06576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610efd90613d73565b60405180910390fd5b80341115610f61573373ffffffffffffffffffffffffffffffffffffffff166108fc8234610f349190613d93565b9081150290604051600060405180830381858888f19350505050158015610f5f573d6000803e3d6000fd5b505b600033600b805490508c8c604051602001610f7f9493929190613dc7565b604051602081830303815290604052905060007f000000000000000000000000000000000000000000000000000000000000000073ffffffffffffffffffffffffffffffffffffffff1663f17325e7604051806040016040528060025481526020016040518060c001604052803073ffffffffffffffffffffffffffffffffffffffff168152602001600067ffffffffffffffff1681526020016000151581526020016000801b815260200187815260200160008152508152506040518263ffffffff1660e01b81526004016110559190613f5d565b6020604051808303816000875af1158015611074573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906110989190613f94565b9050600b60405180608001604052803373ffffffffffffffffffffffffffffffffffffffff1681526020018e81526020018d815260200142815250908060018154018082558091505060019003906000526020600020906004020160009091909190915060008201518160000160006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550602082015181600101556040820151816002019081611162919061416d565b506060820151816003015550503373ffffffffffffffffffffffffffffffffffffffff167ff2be2941b88b0dbd1e3be13bec271cae09dc38710b82f03408f55b79febbe2758d8d6001600b805490506111bb9190613d93565b856040516111cc949392919061423f565b60405180910390a2505050505050505050505050565b6000801b6111ef816128bc565b6111fc6000801b83612771565b5050565b60095481565b600d602052816000526040600020602052806000526040600020600091509150508060000154908060010160009054906101000a900460ff16905082565b6000806000838152602001908152602001600020600101549050919050565b60006112726000801b836124c4565b9050919050565b7ff29a78c020ddf311f61483cfe182d6d833b80b74c6044ef77e24d033c4266a4c81565b7ff29a78c020ddf311f61483cfe182d6d833b80b74c6044ef77e24d033c4266a4c6112c7816128bc565b600a80549050831061130e576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401611305906142d7565b60405180910390fd5b6000801b600d60003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020600085815260200190815260200160002060000154146115d3576000600d60003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000206000858152602001908152602001600020604051806040016040529081600082015481526020016001820160009054906101000a900460ff16151515158152505090508215158160200151151503611439576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161143090614343565b60405180910390fd5b806020015115611485576001600a858154811061145957611458614363565b5b906000526020600020906006020160040160008282546114799190614392565b925050819055506114c3565b6001600a858154811061149b5761149a614363565b5b906000526020600020906006020160040160008282546114bb91906143d5565b925050819055505b7f000000000000000000000000000000000000000000000000000000000000000073ffffffffffffffffffffffffffffffffffffffff1663469262676040518060400160405280600354815260200160405180604001604052808660000151815260200160008152508152506040518263ffffffff1660e01b815260040161154b9190614477565b600060405180830381600087803b15801561156557600080fd5b505af1158015611579573d6000803e3d6000fd5b505050503373ffffffffffffffffffffffffffffffffffffffff167fe2e5ade999c4398ad3a869b0fccb9d2fb965631320edc034c0ae6841efbea0b28583600001516040516115c9929190614492565b60405180910390a2505b811561161b576001600a84815481106115ef576115ee614363565b5b9060005260206000209060060201600401600082825461160f91906143d5565b92505081905550611659565b6001600a848154811061163157611630614363565b5b906000526020600020906006020160040160008282546116519190614392565b925050819055505b60007f000000000000000000000000000000000000000000000000000000000000000073ffffffffffffffffffffffffffffffffffffffff1663f17325e7604051806040016040528060035481526020016040518060c001604052803073ffffffffffffffffffffffffffffffffffffffff168152602001600067ffffffffffffffff168152602001600115158152602001600a8a815481106116ff576116fe614363565b5b906000526020600020906006020160050154815260200133896040516020016117299291906144bb565b604051602081830303815290604052815260200160008152508152506040518263ffffffff1660e01b81526004016117619190613f5d565b6020604051808303816000875af1158015611780573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906117a49190613f94565b90506040518060400160405280828152602001841515815250600d60003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008681526020019081526020016000206000820151816000015560208201518160010160006101000a81548160ff0219169083151502179055509050503373ffffffffffffffffffffffffffffffffffffffff167fa09eef4b4e423ce84118028f1c90e0dc84ac536273b07c057c76bcb249026dbe858584604051611884939291906144e4565b60405180910390a250505050565b61189b82611244565b6118a4816128bc565b6118ae83836128d0565b50505050565b6118bc6129c1565b73ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff1614611920576040517f6697b23200000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b61192a82826129c9565b505050565b6000600b80549050905090565b600c6020528060005260406000206000915090505481565b606061197f7f0000000000000000000000000000000000000000000000000000000000000000612abb565b6119a87f0000000000000000000000000000000000000000000000000000000000000000612abb565b6119d17f0000000000000000000000000000000000000000000000000000000000000000612abb565b6040516020016119e3939291906145a3565b604051602081830303815290604052905090565b6000801b611a04816128bc565b816007819055505050565b600a8181548110611a1f57600080fd5b90600052602060002090600602016000915090508060000160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1690806001015490806002018054611a6e9061375d565b80601f0160208091040260200160405190810160405280929190818152602001828054611a9a9061375d565b8015611ae75780601f10611abc57610100808354040283529160200191611ae7565b820191906000526020600020905b815481529060010190602001808311611aca57829003601f168201915b5050505050908060030154908060040154908060050154905086565b6000801b611b10816128bc565b611b1d6000801b83611892565b5050565b60068054611b2e9061375d565b80601f0160208091040260200160405190810160405280929190818152602001828054611b5a9061375d565b8015611ba75780601f10611b7c57610100808354040283529160200191611ba7565b820191906000526020600020905b815481529060010190602001808311611b8a57829003601f168201915b505050505081565b60075481565b6000801b611bc2816128bc565b816008819055505050565b60025481565b6000611bdd612b89565b6000858590509050838390508114611c21576040517f947d5a8400000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b600034905060005b82811015611cde576000868683818110611c4657611c45614363565b5b90506020020135905082811115611c89576040517f1101129400000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b611cb7898984818110611c9f57611c9e614363565b5b9050602002810190611cb191906145ef565b82612c10565b611cc8576000945050505050611ce6565b808303925050611cd781612c5b565b9050611c29565b506001925050505b949350505050565b7ff29a78c020ddf311f61483cfe182d6d833b80b74c6044ef77e24d033c4266a4c611d18816128bc565b600854600c60003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002054611d659190614618565b421015611da7576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401611d9e906146be565b60405180910390fd5b600754851115611dec576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401611de39061472a565b60405180910390fd5b60008511611e2f576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401611e26906137da565b60405180910390fd5b6000600460009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1663d47eed4585856040518363ffffffff1660e01b8152600401611e8e92919061395e565b602060405180830381865afa158015611eab573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190611ecf9190613997565b90506000600460009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16828686604051602401611f2092919061395e565b6040516020818303038152906040527fef9e5e28000000000000000000000000000000000000000000000000000000007bffffffffffffffffffffffffffffffffffffffffffffffffffffffff19166020820180517bffffffffffffffffffffffffffffffffffffffffffffffffffffffff8381831617835250505050604051611faa9190613a0b565b60006040518083038185875af1925050503d8060008114611fe7576040519150601f19603f3d011682016040523d82523d6000602084013e611fec565b606091505b5050905080612030576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161202790613a6e565b60405180910390fd5b6000600460009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166396834ad36009546040518263ffffffff1660e01b815260040161208f9190613301565b608060405180830381865afa1580156120ac573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906120d09190613bbd565b90506000816000015160070b1361211c576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161211390613c36565b60405180910390fd5b6000816000015160070b90506000816a52b7d2dcc80cd2e40000008b6121429190613c85565b61214c9190613cf6565b9050600047905081811015612196576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161218d90614796565b60405180910390fd5b3373ffffffffffffffffffffffffffffffffffffffff166108fc839081150290604051600060405180830381858888f193505050501580156121dc573d6000803e3d6000fd5b50600033600a805490508d8d6040516020016121fb9493929190613dc7565b604051602081830303815290604052905060007f000000000000000000000000000000000000000000000000000000000000000073ffffffffffffffffffffffffffffffffffffffff1663f17325e7604051806040016040528060015481526020016040518060c001604052803073ffffffffffffffffffffffffffffffffffffffff168152602001600067ffffffffffffffff1681526020016000151581526020016000801b815260200187815260200160008152508152506040518263ffffffff1660e01b81526004016122d19190613f5d565b6020604051808303816000875af11580156122f0573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906123149190613f94565b905042600c60003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002081905550600a6040518060c001604052803373ffffffffffffffffffffffffffffffffffffffff1681526020018f81526020018e81526020014281526020016000815260200183815250908060018154018082558091505060019003906000526020600020906006020160009091909190915060008201518160000160006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555060208201518160010155604082015181600201908161242f919061416d565b50606082015181600301556080820151816004015560a0820151816005015550503373ffffffffffffffffffffffffffffffffffffffff167fd3211fb1bea3aaaba16656c79d4ee432c22336614ce15be8cf03a3ed310a4eb18e8e6001600a8054905061249c9190613d93565b856040516124ad949392919061423f565b60405180910390a250505050505050505050505050565b600080600084815260200190815260200160002060000160008373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060009054906101000a900460ff16905092915050565b6000612538612b89565b600085859050905083839050811461257c576040517f947d5a8400000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b600034905060005b828110156126395760008686838181106125a1576125a0614363565b5b905060200201359050828111156125e4576040517f1101129400000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b6126128989848181106125fa576125f9614363565b5b905060200281019061260c91906145ef565b82612c68565b612623576000945050505050612641565b80830392505061263281612c5b565b9050612584565b506001925050505b949350505050565b6000801b81565b600b818154811061266057600080fd5b90600052602060002090600402016000915090508060000160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff16908060010154908060020180546126af9061375d565b80601f01602080910402602001604051908101604052809291908181526020018280546126db9061375d565b80156127285780601f106126fd57610100808354040283529160200191612728565b820191906000526020600020905b81548152906001019060200180831161270b57829003601f168201915b5050505050908060030154905084565b60006127647ff29a78c020ddf311f61483cfe182d6d833b80b74c6044ef77e24d033c4266a4c836124c4565b9050919050565b60035481565b61277a82611244565b612783816128bc565b61278d83836129c9565b50505050565b6000801b6127a0816128bc565b6127ca7ff29a78c020ddf311f61483cfe182d6d833b80b74c6044ef77e24d033c4266a4c83612771565b5050565b60015481565b6000801b6127e1816128bc565b61280b7ff29a78c020ddf311f61483cfe182d6d833b80b74c6044ef77e24d033c4266a4c83611892565b5050565b6000600a80549050905090565b6000612826612b89565b6128308234612c10565b9050919050565b6000612841612b89565b61284b8234612c68565b9050919050565b60007f01ffc9a7000000000000000000000000000000000000000000000000000000007bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916827bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916149050919050565b6128cd816128c86129c1565b612cb3565b50565b60006128dc83836124c4565b6129b657600160008085815260200190815260200160002060000160008473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060006101000a81548160ff0219169083151502179055506129536129c1565b73ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff16847f2f8788117e7eff1d82e926ec794901d17c78024a50270940304540a733656f0d60405160405180910390a4600190506129bb565b600090505b92915050565b600033905090565b60006129d583836124c4565b15612ab057600080600085815260200190815260200160002060000160008473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060006101000a81548160ff021916908315150217905550612a4d6129c1565b73ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff16847ff6391f5c32d9c69d2a47ea670b442974b53935d1edc7fd64eb21e047a839171b60405160405180910390a460019050612ab5565b600090505b92915050565b606060006001612aca84612d04565b01905060008167ffffffffffffffff811115612ae957612ae8613042565b5b6040519080825280601f01601f191660200182016040528015612b1b5781602001600182028036833780820191505090505b509050600082602001820190505b600115612b7e578080600190039150507f3031323334353637383961626364656600000000000000000000000000000000600a86061a8153600a8581612b7257612b71613cc7565b5b04945060008503612b29575b819350505050919050565b7f000000000000000000000000000000000000000000000000000000000000000073ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff1614612c0e576040517f4ca8886700000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b565b60003073ffffffffffffffffffffffffffffffffffffffff168360e0016020810190612c3c91906132bb565b73ffffffffffffffffffffffffffffffffffffffff1614905092915050565b6000600182019050919050565b60003073ffffffffffffffffffffffffffffffffffffffff168360e0016020810190612c9491906132bb565b73ffffffffffffffffffffffffffffffffffffffff1614905092915050565b612cbd82826124c4565b612d005780826040517fe2517d3f000000000000000000000000000000000000000000000000000000008152600401612cf79291906147b6565b60405180910390fd5b5050565b600080600090507a184f03e93ff9f4daa797ed6e38ed64bf6a1f0100000000000000008310612d62577a184f03e93ff9f4daa797ed6e38ed64bf6a1f0100000000000000008381612d5857612d57613cc7565b5b0492506040810190505b6d04ee2d6d415b85acef81000000008310612d9f576d04ee2d6d415b85acef81000000008381612d9557612d94613cc7565b5b0492506020810190505b662386f26fc100008310612dce57662386f26fc100008381612dc457612dc3613cc7565b5b0492506010810190505b6305f5e1008310612df7576305f5e1008381612ded57612dec613cc7565b5b0492506008810190505b6127108310612e1c576127108381612e1257612e11613cc7565b5b0492506004810190505b60648310612e3f5760648381612e3557612e34613cc7565b5b0492506002810190505b600a8310612e4e576001810190505b80915050919050565b6000604051905090565b600080fd5b600080fd5b60007fffffffff0000000000000000000000000000000000000000000000000000000082169050919050565b612ea081612e6b565b8114612eab57600080fd5b50565b600081359050612ebd81612e97565b92915050565b600060208284031215612ed957612ed8612e61565b5b6000612ee784828501612eae565b91505092915050565b60008115159050919050565b612f0581612ef0565b82525050565b6000602082019050612f206000830184612efc565b92915050565b6000819050919050565b612f3981612f26565b82525050565b6000602082019050612f546000830184612f30565b92915050565b600081519050919050565b600082825260208201905092915050565b60005b83811015612f94578082015181840152602081019050612f79565b60008484015250505050565b6000601f19601f8301169050919050565b6000612fbc82612f5a565b612fc68185612f65565b9350612fd6818560208601612f76565b612fdf81612fa0565b840191505092915050565b600060208201905081810360008301526130048184612fb1565b905092915050565b61301581612f26565b811461302057600080fd5b50565b6000813590506130328161300c565b92915050565b600080fd5b600080fd5b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b61307a82612fa0565b810181811067ffffffffffffffff8211171561309957613098613042565b5b80604052505050565b60006130ac612e57565b90506130b88282613071565b919050565b600067ffffffffffffffff8211156130d8576130d7613042565b5b6130e182612fa0565b9050602081019050919050565b82818337600083830152505050565b600061311061310b846130bd565b6130a2565b90508281526020810184848401111561312c5761312b61303d565b5b6131378482856130ee565b509392505050565b600082601f83011261315457613153613038565b5b81356131648482602086016130fd565b91505092915050565b600080fd5b600080fd5b60008083601f84011261318d5761318c613038565b5b8235905067ffffffffffffffff8111156131aa576131a961316d565b5b6020830191508360208202830111156131c6576131c5613172565b5b9250929050565b600080600080606085870312156131e7576131e6612e61565b5b60006131f587828801613023565b945050602085013567ffffffffffffffff81111561321657613215612e66565b5b6132228782880161313f565b935050604085013567ffffffffffffffff81111561324357613242612e66565b5b61324f87828801613177565b925092505092959194509250565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b60006132888261325d565b9050919050565b6132988161327d565b81146132a357600080fd5b50565b6000813590506132b58161328f565b92915050565b6000602082840312156132d1576132d0612e61565b5b60006132df848285016132a6565b91505092915050565b6000819050919050565b6132fb816132e8565b82525050565b600060208201905061331660008301846132f2565b92915050565b6000806040838503121561333357613332612e61565b5b6000613341858286016132a6565b925050602061335285828601613023565b9150509250929050565b600060408201905061337160008301856132f2565b61337e6020830184612efc565b9392505050565b61338e816132e8565b811461339957600080fd5b50565b6000813590506133ab81613385565b92915050565b6000602082840312156133c7576133c6612e61565b5b60006133d58482850161339c565b91505092915050565b6133e781612ef0565b81146133f257600080fd5b50565b600081359050613404816133de565b92915050565b6000806040838503121561342157613420612e61565b5b600061342f85828601613023565b9250506020613440858286016133f5565b9150509250929050565b6000806040838503121561346157613460612e61565b5b600061346f8582860161339c565b9250506020613480858286016132a6565b9150509250929050565b6000602082840312156134a05761349f612e61565b5b60006134ae84828501613023565b91505092915050565b6134c08161327d565b82525050565b6000819050919050565b6134d9816134c6565b82525050565b600060c0820190506134f460008301896134b7565b6135016020830188612f30565b81810360408301526135138187612fb1565b90506135226060830186612f30565b61352f60808301856134d0565b61353c60a08301846132f2565b979650505050505050565b60008083601f84011261355d5761355c613038565b5b8235905067ffffffffffffffff81111561357a5761357961316d565b5b60208301915083602082028301111561359657613595613172565b5b9250929050565b60008083601f8401126135b3576135b2613038565b5b8235905067ffffffffffffffff8111156135d0576135cf61316d565b5b6020830191508360208202830111156135ec576135eb613172565b5b9250929050565b6000806000806040858703121561360d5761360c612e61565b5b600085013567ffffffffffffffff81111561362b5761362a612e66565b5b61363787828801613547565b9450945050602085013567ffffffffffffffff81111561365a57613659612e66565b5b6136668782880161359d565b925092505092959194509250565b600060808201905061368960008301876134b7565b6136966020830186612f30565b81810360408301526136a88185612fb1565b90506136b76060830184612f30565b95945050505050565b600080fd5b600061014082840312156136dc576136db6136c0565b5b81905092915050565b6000602082840312156136fb576136fa612e61565b5b600082013567ffffffffffffffff81111561371957613718612e66565b5b613725848285016136c5565b91505092915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b6000600282049050600182168061377557607f821691505b6020821081036137885761378761372e565b5b50919050565b7f416d6f756e74206d7573742062652067726561746572207468616e2030000000600082015250565b60006137c4601d83612f65565b91506137cf8261378e565b602082019050919050565b600060208201905081810360008301526137f3816137b7565b9050919050565b600082825260208201905092915050565b6000819050919050565b600082825260208201905092915050565b60006138328385613815565b935061383f8385846130ee565b61384883612fa0565b840190509392505050565b6000613860848484613826565b90509392505050565b600080fd5b600080fd5b600080fd5b6000808335600160200384360303811261389557613894613873565b5b83810192508235915060208301925067ffffffffffffffff8211156138bd576138bc613869565b5b6001820236038313156138d3576138d261386e565b5b509250929050565b6000602082019050919050565b60006138f483856137fa565b9350836020840285016139068461380b565b8060005b8781101561394c5784840389526139218284613878565b61392c868284613853565b9550613937846138db565b935060208b019a50505060018101905061390a565b50829750879450505050509392505050565b600060208201905081810360008301526139798184866138e8565b90509392505050565b6000815190506139918161300c565b92915050565b6000602082840312156139ad576139ac612e61565b5b60006139bb84828501613982565b91505092915050565b600081519050919050565b600081905092915050565b60006139e5826139c4565b6139ef81856139cf565b93506139ff818560208601612f76565b80840191505092915050565b6000613a1782846139da565b915081905092915050565b7f5072696365206665656420757064617465206661696c65640000000000000000600082015250565b6000613a58601883612f65565b9150613a6382613a22565b602082019050919050565b60006020820190508181036000830152613a8781613a4b565b9050919050565b600080fd5b60008160070b9050919050565b613aa981613a93565b8114613ab457600080fd5b50565b600081519050613ac681613aa0565b92915050565b600067ffffffffffffffff82169050919050565b613ae981613acc565b8114613af457600080fd5b50565b600081519050613b0681613ae0565b92915050565b60008160030b9050919050565b613b2281613b0c565b8114613b2d57600080fd5b50565b600081519050613b3f81613b19565b92915050565b600060808284031215613b5b57613b5a613a8e565b5b613b6560806130a2565b90506000613b7584828501613ab7565b6000830152506020613b8984828501613af7565b6020830152506040613b9d84828501613b30565b6040830152506060613bb184828501613982565b60608301525092915050565b600060808284031215613bd357613bd2612e61565b5b6000613be184828501613b45565b91505092915050565b7f496e76616c6964206e617469766520746f6b656e2f5553442070726963650000600082015250565b6000613c20601e83612f65565b9150613c2b82613bea565b602082019050919050565b60006020820190508181036000830152613c4f81613c13565b9050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b6000613c9082612f26565b9150613c9b83612f26565b9250828202613ca981612f26565b91508282048414831517613cc057613cbf613c56565b5b5092915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601260045260246000fd5b6000613d0182612f26565b9150613d0c83612f26565b925082613d1c57613d1b613cc7565b5b828204905092915050565b7f496e73756666696369656e742066756e647320696e206d73672e76616c756500600082015250565b6000613d5d601f83612f65565b9150613d6882613d27565b602082019050919050565b60006020820190508181036000830152613d8c81613d50565b9050919050565b6000613d9e82612f26565b9150613da983612f26565b9250828203905081811115613dc157613dc0613c56565b5b92915050565b6000608082019050613ddc60008301876134b7565b613de96020830186612f30565b613df66040830185612f30565b8181036060830152613e088184612fb1565b905095945050505050565b613e1c816132e8565b82525050565b613e2b8161327d565b82525050565b613e3a81613acc565b82525050565b613e4981612ef0565b82525050565b6000613e5a826139c4565b613e648185613815565b9350613e74818560208601612f76565b613e7d81612fa0565b840191505092915050565b613e9181612f26565b82525050565b600060c083016000830151613eaf6000860182613e22565b506020830151613ec26020860182613e31565b506040830151613ed56040860182613e40565b506060830151613ee86060860182613e13565b5060808301518482036080860152613f008282613e4f565b91505060a0830151613f1560a0860182613e88565b508091505092915050565b6000604083016000830151613f386000860182613e13565b5060208301518482036020860152613f508282613e97565b9150508091505092915050565b60006020820190508181036000830152613f778184613f20565b905092915050565b600081519050613f8e81613385565b92915050565b600060208284031215613faa57613fa9612e61565b5b6000613fb884828501613f7f565b91505092915050565b60008190508160005260206000209050919050565b60006020601f8301049050919050565b600082821b905092915050565b6000600883026140237fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff82613fe6565b61402d8683613fe6565b95508019841693508086168417925050509392505050565b6000819050919050565b600061406a61406561406084612f26565b614045565b612f26565b9050919050565b6000819050919050565b6140848361404f565b61409861409082614071565b848454613ff3565b825550505050565b600090565b6140ad6140a0565b6140b881848461407b565b505050565b5b818110156140dc576140d16000826140a5565b6001810190506140be565b5050565b601f821115614121576140f281613fc1565b6140fb84613fd6565b8101602085101561410a578190505b61411e61411685613fd6565b8301826140bd565b50505b505050565b600082821c905092915050565b600061414460001984600802614126565b1980831691505092915050565b600061415d8383614133565b9150826002028217905092915050565b61417682612f5a565b67ffffffffffffffff81111561418f5761418e613042565b5b614199825461375d565b6141a48282856140e0565b600060209050601f8311600181146141d757600084156141c5578287015190505b6141cf8582614151565b865550614237565b601f1984166141e586613fc1565b60005b8281101561420d578489015182556001820191506020850194506020810190506141e8565b8683101561422a5784890151614226601f891682614133565b8355505b6001600288020188555050505b505050505050565b60006080820190506142546000830187612f30565b81810360208301526142668186612fb1565b90506142756040830185612f30565b61428260608301846132f2565b95945050505050565b7f496e76616c6964207769746864726177616c2049440000000000000000000000600082015250565b60006142c1601583612f65565b91506142cc8261428b565b602082019050919050565b600060208201905081810360008301526142f0816142b4565b9050919050565b7f53616d6520766f746520616761696e0000000000000000000000000000000000600082015250565b600061432d600f83612f65565b9150614338826142f7565b602082019050919050565b6000602082019050818103600083015261435c81614320565b9050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052603260045260246000fd5b600061439d826134c6565b91506143a8836134c6565b92508282039050818112600084121682821360008512151617156143cf576143ce613c56565b5b92915050565b60006143e0826134c6565b91506143eb836134c6565b92508282019050828112156000831216838212600084121516171561441357614412613c56565b5b92915050565b60408201600082015161442f6000850182613e13565b5060208201516144426020850182613e88565b50505050565b60608201600082015161445e6000850182613e13565b5060208201516144716020850182614419565b50505050565b600060608201905061448c6000830184614448565b92915050565b60006040820190506144a76000830185612f30565b6144b460208301846132f2565b9392505050565b60006040820190506144d060008301856134b7565b6144dd6020830184612efc565b9392505050565b60006060820190506144f96000830186612f30565b6145066020830185612efc565b61451360408301846132f2565b949350505050565b600081905092915050565b600061453182612f5a565b61453b818561451b565b935061454b818560208601612f76565b80840191505092915050565b7f2e00000000000000000000000000000000000000000000000000000000000000600082015250565b600061458d60018361451b565b915061459882614557565b600182019050919050565b60006145af8286614526565b91506145ba82614580565b91506145c68285614526565b91506145d182614580565b91506145dd8284614526565b9150819050949350505050565b600080fd5b6000823560016101400383360303811261460c5761460b6145ea565b5b80830191505092915050565b600061462382612f26565b915061462e83612f26565b925082820190508082111561464657614645613c56565b5b92915050565b7f436f6f6c646f776e20706572696f64206e6f7420656c61707365642c20706c6560008201527f6173652074727920616761696e206c6174657200000000000000000000000000602082015250565b60006146a8603383612f65565b91506146b38261464c565b604082019050919050565b600060208201905081810360008301526146d78161469b565b9050919050565b7f416d6f756e742065786365656473207769746864726177616c206c696d697400600082015250565b6000614714601f83612f65565b915061471f826146de565b602082019050919050565b6000602082019050818103600083015261474381614707565b9050919050565b7f496e73756666696369656e742066756e647320696e20746865206a6172000000600082015250565b6000614780601d83612f65565b915061478b8261474a565b602082019050919050565b600060208201905081810360008301526147af81614773565b9050919050565b60006040820190506147cb60008301856134b7565b6147d860208301846132f2565b939250505056fea264697066735822122042b61f06944c3bfc0f48c319fecd8179c754b9334f4239fc620873f4cce2647064736f6c634300081a003328616464726573732064616f5f6d656d6265722c2075696e74323536206465706f7369745f69642c2075696e7432353620616d6f756e742c20737472696e67206e6f74652928616464726573732064616f5f6d656d6265722c20626f6f6c2069735f7570766f74652928616464726573732064616f5f6d656d6265722c2075696e743235362077697468647261775f69642c2075696e7432353620616d6f756e742c20737472696e67206e6f746529';
const Home: NextPage = () => {
  const { address } = useAccount();
  const chainId = useChainId() as (typeof validChainIds)[number];
  const [transactionHash, setTransactionHash] = useState('');
  const receipt = useWaitForTransactionReceipt({
    chainId: chainId,
    hash: transactionHash ? (`${transactionHash}` as `0x${string}`) : undefined,
  });
  const { deployContractAsync } = useDeployContract();
  const [jars, setJars] = useState<Jar[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [modalIsOpen, setModalIsOpen] = useState<boolean>(false);
  const [withdrawLimit, setWithdrawLimit] = useState(100);
  const [cooldownPeriod, setCooldownPeriod] = useState(8);
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false); // New state for form submission
  const [newJar, setNewJar] = useState<{
    name: string;
    description: string;
    withdrawLimit: number;
    cooldownPeriod: number;
    contractAddress: string;
  }>({
    name: 'Jar name',
    description: 'Some description',
    contractAddress: '',
    withdrawLimit: 100,
    cooldownPeriod: 8,
  });

  useEffect(() => {
    // Only fetch jars if address is available
    if (!address || !chainId) {
      setLoading(true); // Set loading state while waiting for address
      return;
    }

    const fetchJars = async () => {
      try {
        const response = await fetch(
          `/api/jars?address=${address}&chain=${chainId}`,
        );
        if (!response.ok) {
          throw new Error('Error fetching jars');
        }
        const data: Jar[] = await response.json();
        updateJars(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchJars();
  }, [address, chainId]);

  const openModal = () => {
    setModalIsOpen(true);
  };

  const closeModal = () => {
    setModalIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // console.log(e);
    const { name, value } = e.target;
    // Convert value to a number if the input type is "number"
    const parsedValue = e.target.type === 'number' ? Number(value) : value;

    setNewJar((prevState) => ({
      ...prevState,
      [name]: parsedValue,
    }));
  };

  const updateJars = async (data: Jar[]) => {
    const response = await fetch(
      `https://hermes.pyth.network/v2/updates/price/latest?ids%5B%5D=${priceFeedId[chainId]}`,
    );
    const res = await response.json();
    const price = Number(res.parsed[0].price.price) / Number(1e26);

    const jarsWithBalance = await Promise.all(
      data.map(async (jar) => {
        return {
          ...jar,
          balance: Math.round(
            Number(
              (
                await getBalance(config, {
                  chainId: chainId,
                  address: jar.contractAddress as `0x${string}`,
                })
              ).value,
            ) * price,
          ),
        };
      }),
    );
    setJars(jarsWithBalance);
  };

  useEffect(() => {
    if (receipt.status === 'success') {
      const createJar = async () => {
        try {
          const response = await fetch(
            `/api/jars?address=${address}&chain=${chainId}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                ...newJar,
                contractAddress: receipt.data?.contractAddress,
              }),
            },
          );

          if (!response.ok) {
            throw new Error('Error creating jar');
          }

          const jar: Jar = await response.json();
          console.log('got jar:', jar);
          const data: Jar[] = [jar, ...jars];
          updateJars(data);

          closeModal();
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setFormSubmitting(false); // Reset form submission state
        }
      };

      createJar();
    }
  }, [receipt.status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true); // Reset form submission state
    try {
      console.log('posting jar', JSON.stringify(newJar));
      try {
        console.log(chainId, easAddress[chainId], [
          newJar.name,
          newJar.description,
          newJar.withdrawLimit,
          newJar.cooldownPeriod * 3600,
          easAddress[chainId],
          pythAddress[chainId],
          priceFeedId[chainId],
        ]);
        const hash = await deployContractAsync({
          abi: jarContractAbi,
          args: [
            newJar.name,
            newJar.description,
            newJar.withdrawLimit,
            newJar.cooldownPeriod * 3600,
            easAddress[chainId],
            pythAddress[chainId],
            priceFeedId[chainId],
          ],
          // bytecode: chainId == 42220 ? jarContractBytecodeCelo : jarContractBytecode,
          bytecode: jarContractBytecode,
        });
        console.log('hash:', hash);
        setTransactionHash(hash);
      } catch (err) {
        console.log(err);
        setTransactionHash('');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setFormSubmitting(false); // Reset form submission state
    }
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Cookie Jar</title>
        <meta content="Cookie Jar" name="description" />
        <link href="/favicon/favicon.png" rel="icon" type="image/x-icon" />
      </Head>

      <main className={styles.main}>
        <ConnectButton />
        <button onClick={openModal} className={styles.modalButton}>
          Create New Jar
        </button>

        <Modal
          isOpen={modalIsOpen}
          onRequestClose={closeModal}
          ariaHideApp={false}
          contentLabel="Create New Jar"
          className={styles.modalContent}
        >
          <h2>Create a New Jar</h2>
          <form onSubmit={handleSubmit} className={styles.modalContent}>
            <label className={styles.modalLabel}>
              Name:
              <input
                type="text"
                name="name"
                placeholder="Jar name"
                value={newJar.name}
                onChange={handleInputChange}
                required
                className={styles.modalInput}
              />
            </label>
            <label className={styles.modalLabel}>
              Description:
              <input
                type="text"
                name="description"
                placeholder="Some description"
                value={newJar.description}
                onChange={handleInputChange}
                required
                className={styles.modalInput}
              />
            </label>
            <label className={styles.modalLabel}>
              Withdrawal limit (in USD):
              <input
                type="number"
                name="withdraw-limit"
                value={withdrawLimit}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setNewJar({ ...newJar, withdrawLimit: val });
                  return setWithdrawLimit(Number(e.target.value));
                }}
                required
                className={styles.modalInput}
              />
            </label>
            <label className={styles.modalLabel}>
              Cooldown period (in hours):
              <input
                type="number"
                name="cooldown-period"
                value={cooldownPeriod}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setNewJar({ ...newJar, cooldownPeriod: val });
                  return setCooldownPeriod(Number(e.target.value));
                }}
                required
                className={styles.modalInput}
              />
            </label>
            <div>
              <button type="submit" className={styles.modalButton}>
                Create
              </button>
              <button
                type="button"
                onClick={closeModal}
                className={styles.modalButton + ' ' + styles.modalButtonCancel}
              >
                Cancel
              </button>
              {formSubmitting && <p>Submitting...</p>}
            </div>
          </form>
        </Modal>

        {loading ? (
          <p>Loading...</p>
        ) : error ? (
          <p>Error: {error}</p>
        ) : (
          <div className={styles.grid}>
            {jars.map((jar) => {
              const href = `/jar?jarAddress=${jar.contractAddress}&chain=${chainId}`;
              return (
                <a
                  key={jar.contractAddress}
                  className={styles.card}
                  href={href}
                >
                  <h2>{jar.name} &rarr;</h2>
                  <p>{jar.description}</p>
                  <p>balance: {jar.balance.toString()} USD</p>
                </a>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Home;
