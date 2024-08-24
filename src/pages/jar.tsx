import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useChainId } from 'wagmi';
import { parseEther } from 'viem';
import Head from 'next/head';
import styles from '../styles/Home.module.css';
import {
  writeContract,
  readContract,
  getBalance,
  waitForTransactionReceipt,
} from '@wagmi/core';
import { config } from '../wagmi';
import { validChainIds, jarContractAbi, priceFeedId, Operation } from './index';
import { isDataView } from 'util/types';

const Page = () => {
  const router = useRouter();
  const { address } = useAccount();
  const chainId = useChainId() as (typeof validChainIds)[number];
  const { jarAddress, chain } = router.query;
  const [user, setUser] = useState(null);
  const [jarName, setJarName] = useState('');
  const [jarDescription, setJarDescription] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDAOMember, setIsDAOMember] = useState(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [jarBalance, setJarBalance] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositNote, setDepositNote] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawNote, setWithdrawNote] = useState('');
  const [addDAOMember, setAddDAOMember] = useState('');
  const [removeDAOMember, setRemoveDAOMember] = useState('');
  const [trigger, setTrigger] = useState(0); // State variable to trigger useEffect

  useEffect(() => {
    // Only fetch jars if address is available
    if (!address || !jarAddress || !chainId) {
      setLoading(true); // Set loading state while waiting for address
      return;
    }

    const fetchJars = async () => {
      try {
        const res = await fetch(
          `https://hermes.pyth.network/v2/updates/price/latest?ids%5B%5D=${priceFeedId[chainId]}`,
        );
        const priceData = await res.json();
        const price = Number(priceData.parsed[0].price.price) / Number(1e26);

        const result = Number(
          (
            await getBalance(config, {
              chainId: chainId,
              address: jarAddress as `0x${string}`,
            })
          ).value,
        );

        const jarName = (await readContract(config, {
          chainId: chainId,
          abi: jarContractAbi,
          address: jarAddress as `0x${string}`,
          functionName: 'name',
        })) as string;
        setJarName(jarName);
        const jarDescription = (await readContract(config, {
          chainId: chainId,
          abi: jarContractAbi,
          address: jarAddress as `0x${string}`,
          functionName: 'description',
        })) as string;
        setJarDescription(jarDescription);
        const isAdmin = (await readContract(config, {
          chainId: chainId,
          abi: jarContractAbi,
          address: jarAddress as `0x${string}`,
          functionName: 'isAdmin',
          args: [address],
        })) as boolean;
        setIsAdmin(isAdmin);
        const isDAOMember = (await readContract(config, {
          chainId: chainId,
          abi: jarContractAbi,
          address: jarAddress as `0x${string}`,
          functionName: 'isDAOMember',
          args: [address],
        })) as boolean;
        setIsDAOMember(isDAOMember);

        setDepositAmount('');
        setWithdrawAmount('');
        setDepositNote('');
        setWithdrawNote('');
        setAddDAOMember('');
        setRemoveDAOMember('');

        setJarBalance(Math.round(result * price));

        const response = await fetch(
          `/api/jars?jarAddress=${jarAddress}&chain=${chainId}`,
        );
        if (!response.ok) {
          throw new Error('Error fetching jars');
        }
        const data: Operation[] = await response.json();

        setOperations(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchJars();
  }, [address, jarAddress, chainId, trigger]);

  const forceFetchJars = () => {
    setTrigger((prev) => prev + 1); // Increment the trigger to force useEffect to re-run
  };

  const deposit = async () => {
    try {
      const response = await fetch(
        `https://hermes.pyth.network/v2/updates/price/latest?ids%5B%5D=${priceFeedId[chainId]}`,
      );
      const data = await response.json();
      const binaryData = [`0x${data.binary.data[0]}`];
      const price = Number(data.parsed[0].price.price) / Number(1e8);

      // console.log((Number(depositAmount)*(2+Math.random())/price).toFixed(6))
      const result = await writeContract(config, {
        chainId: chainId,
        abi: jarContractAbi,
        address: jarAddress as `0x${string}`,
        functionName: 'deposit',
        value: parseEther(
          `${((Number(depositAmount) * (1 + Math.random() / 1.5)) / price).toFixed(6)}`,
        ),
        // value: parseEther(`0.001`),
        args: [depositAmount, depositNote, binaryData],
      });
      setLoading(true);
      await waitForTransactionReceipt(config, {
        chainId: chainId,
        hash: result,
      });
      console.log('Native deposit successful', result);
      const id =
        Number(
          await readContract(config, {
            chainId: chainId,
            abi: jarContractAbi,
            address: jarAddress as `0x${string}`,
            functionName: 'getDepositsCount',
          }),
        ) - 1;
      const operation: Operation = {
        id: id,
        user: String(address),
        isDeposit: true,
        amount: Number(depositAmount),
        note: depositNote,
        score: 0,
        votes: [],
      };
      await fetch(`/api/jars?jarAddress=${jarAddress}&chain=${chainId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(operation),
      });
      forceFetchJars();
    } catch (error) {
      console.error('Error depositing native token:', error);
    } finally {
      setLoading(false);
    }
  };

  const withdraw = async () => {
    try {
      const response = await fetch(
        `https://hermes.pyth.network/v2/updates/price/latest?ids%5B%5D=${priceFeedId[chainId]}`,
      );
      const data = await response.json();
      const binaryData = [`0x${data.binary.data[0]}`];

      console.log([withdrawAmount, withdrawNote, binaryData]);
      const result = await writeContract(config, {
        abi: jarContractAbi,
        address: jarAddress as `0x${string}`,
        functionName: 'withdraw',
        args: [withdrawAmount, withdrawNote, binaryData],
      });
      setLoading(true);
      await waitForTransactionReceipt(config, {
        chainId: chainId,
        hash: result,
      });

      console.log('Native withdrawal successful', result);
      const id =
        Number(
          await readContract(config, {
            chainId: chainId,
            abi: jarContractAbi,
            address: jarAddress as `0x${string}`,
            functionName: 'getWithdrawalsCount',
          }),
        ) - 1;
      const operation: Operation = {
        id: id,
        user: String(address),
        isDeposit: false,
        amount: Number(withdrawAmount),
        note: withdrawNote,
        score: 0,
        votes: [],
      };
      await fetch(`/api/jars?jarAddress=${jarAddress}&chain=${chainId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(operation),
      });
      forceFetchJars();
    } catch (error) {
      console.error('Error withdrawing native token:', error);
    } finally {
      setLoading(false);
    }
  };

  const vote = async (id: number, isUpvote: boolean) => {
    try {
      console.log(id, isUpvote);
      const result = await writeContract(config, {
        abi: jarContractAbi,
        address: jarAddress as `0x${string}`,
        functionName: 'voteOnWithdraw',
        args: [id, isUpvote],
      });
      setLoading(true);
      await waitForTransactionReceipt(config, {
        chainId: chainId,
        hash: result,
      });

      console.log('Vote successful', result);

      await fetch(
        `/api/vote?jarAddress=${jarAddress}&address=${address}&id=${id}&isUpvote=${isUpvote}&chain=${chainId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        },
      );
      forceFetchJars();
    } catch (error) {
      console.error('Error voting:', error);
    } finally {
      setLoading(false);
    }
  };

  const addMember = async () => {
    try {
      const result = await writeContract(config, {
        abi: jarContractAbi,
        address: jarAddress as `0x${string}`,
        functionName: 'addDAOMember',
        args: [addDAOMember],
      });
      setLoading(true);
      await waitForTransactionReceipt(config, {
        chainId: chainId,
        hash: result,
      });

      console.log('Add member successful', result);
    } catch (error) {
      console.error('Error adding member:', error);
    } finally {
      setLoading(false);
    }
  };
  const removeMember = async () => {
    try {
      const result = await writeContract(config, {
        abi: jarContractAbi,
        address: jarAddress as `0x${string}`,
        functionName: 'removeDAOMember',
        args: [removeDAOMember],
      });
      setLoading(true);
      await waitForTransactionReceipt(config, {
        chainId: chainId,
        hash: result,
      });

      console.log('Remove member successful', result);
    } catch (error) {
      console.error('Error removing member:', error);
    } finally {
      setLoading(false);
    }
  };
  const emergencyWithdrawAll = async () => {
    try {
      const result = await writeContract(config, {
        abi: jarContractAbi,
        address: jarAddress as `0x${string}`,
        functionName: 'emergencyWithdrawNative',
      });
      setLoading(true);
      await waitForTransactionReceipt(config, {
        chainId: chainId,
        hash: result,
      });

      console.log('Emergency withdraw successful', result);
      forceFetchJars();
    } catch (error) {
      console.error('Error emergency withdraw:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Head>
        <title>Cookie Jar</title>
        <meta content="Cookie Jar" name="description" />
        <link href="/favicon/favicon.png" rel="icon" type="image/x-icon" />
      </Head>

      <a href="/">Home</a>
      <ConnectButton />
      <h1>{jarName}</h1>
      <h2>{jarDescription}</h2>
      <h1>Balance: {loading ? '...' : jarBalance} USD</h1>
      <div>DAO member {isDAOMember ? '✅' : '❌'}</div>
      <div>Admin {isAdmin ? '✅' : '❌'}</div>
      <div>
        {isDAOMember && (
          <div className={styles.verticalAlign}>
            <div>
              <input
                type="number"
                placeholder="Amount"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
              />
              <input
                type="text"
                placeholder="Note"
                value={depositNote}
                onChange={(e) => setDepositNote(e.target.value)}
              />
              <button onClick={deposit} className={styles.modalButton}>
                Deposit
              </button>
            </div>
            <div>
              <input
                type="number"
                placeholder="Amount"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
              />
              <input
                type="text"
                placeholder="Note"
                value={withdrawNote}
                onChange={(e) => setWithdrawNote(e.target.value)}
              />
              <button onClick={withdraw} className={styles.modalButton}>
                Withdraw
              </button>
            </div>
          </div>
        )}
      </div>
      <div>
        {isAdmin && (
          <div className={styles.verticalAlign}>
            <div>
              <input
                type="test"
                placeholder="0x..."
                value={addDAOMember}
                onChange={(e) => setAddDAOMember(e.target.value)}
              />
              <button onClick={addMember} className={styles.modalButton}>
                Add member
              </button>
            </div>
            <div>
              <input
                type="text"
                placeholder="0x..."
                value={removeDAOMember}
                onChange={(e) => setRemoveDAOMember(e.target.value)}
              />
              <button onClick={removeMember} className={styles.modalButton}>
                Remove member
              </button>
            </div>
            <div>
              <button
                onClick={emergencyWithdrawAll}
                className={styles.modalButton}
              >
                Emergency withdraw all
              </button>
            </div>
          </div>
        )}
      </div>
      <div>{loading && <p>Loading...</p>}</div>
      <div className={styles.verticalAlign}>
        {operations.map((operation) => {
          return (
            <div
              key={`${operation.isDeposit ? 'deposit-' : 'withdraw-'}${operation.id}`}
              className={styles.card}
            >
              <p>
                <b>{operation.isDeposit ? 'deposit' : 'withdraw'}</b>
              </p>
              <p>user: {operation.user}</p>
              <p>amount: {operation.amount} USD</p>
              <p>{operation.note}</p>
              {!operation.isDeposit && <p>score: {operation.score}</p>}
              {isDAOMember && !operation.isDeposit && (
                <div>
                  <button onClick={() => vote(operation.id, true)}>+</button>
                  <button onClick={() => vote(operation.id, false)}>-</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Page;
