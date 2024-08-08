import React, {useEffect, useState} from 'react';
import { useRouter } from 'next/router';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useChainId } from 'wagmi';
import { parseEther } from 'viem'
import styles from '../styles/Home.module.css';
import { writeContract, readContract, getBalance, waitForTransactionReceipt } from '@wagmi/core'
import { config } from '../wagmi';
import { validChainIds, jarContractAbi, priceFeedId, Operation } from './index';

const Page = () => {
  const router = useRouter();
  const { address } = useAccount();
  const chainId = useChainId() as typeof validChainIds[number];
  const { jarAddress, chain } = router.query;
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [jarBalance, setJarBalance] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositNote, setDepositNote] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawNote, setWithdrawNote] = useState('');
  const [trigger, setTrigger] = useState(0); // State variable to trigger useEffect
  


  useEffect(() => {
    // Only fetch jars if address is available
    if (!address || !jarAddress || !chainId) {
      setLoading(true); // Set loading state while waiting for address
      return;
    }

    const fetchJars = async () => {
      try {
        const res = await fetch(`https://hermes.pyth.network/v2/updates/price/latest?ids%5B%5D=${priceFeedId[chainId]}`);
        const priceData = await res.json();
        const price = Number(priceData.parsed[0].price.price) / Number(1e26);

        const result = Number((await getBalance(config, {
          chainId: chainId,
          address: jarAddress as `0x${string}`,
        })).value);

        setJarBalance(Math.round(result * price));

        const response = await fetch(`/api/jars?jarAddress=${jarAddress}&chain=${chainId}`);
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
    setTrigger(prev => prev + 1); // Increment the trigger to force useEffect to re-run
  };

  const deposit = async () => {
    try {
      const response = await fetch(`https://hermes.pyth.network/v2/updates/price/latest?ids%5B%5D=${priceFeedId[chainId]}`);
      const data = await response.json();
      const binaryData = [`0x${data.binary.data[0]}`];
      const price = Number(data.parsed[0].price.price) / Number(1e8);

      console.log((Number(depositAmount)*(2+Math.random())/price).toFixed(6))
      const result = await writeContract(config, {
        chainId: chainId,
        abi: jarContractAbi,
        address: jarAddress as `0x${string}`,
        functionName: 'deposit',
        value: parseEther(`${(Number(depositAmount)*(1.5+Math.random())/price).toFixed(6)}`),
        // value: parseEther(`0.001`),
        args: [
          depositAmount,
          depositNote,
          binaryData,
        ],
      });
      await waitForTransactionReceipt(config, {
        chainId: chainId,
        hash: result
      });
      console.log('Native deposit successful', result);
      const id = Number(await readContract(config, {
        chainId: chainId,
        abi: jarContractAbi,
        address: jarAddress as `0x${string}`,
        functionName: 'getWithdrawalsCount',
      }))
      const operation: Operation = {
        id: id,
        user: String(address),
        isDeposit: true,
        amount: Number(depositAmount),
        note: depositNote,
        score: 0,
      }
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
    }
  };

  const withdraw = async () => {
    try {
      const response = await fetch(`https://hermes.pyth.network/v2/updates/price/latest?ids%5B%5D=${priceFeedId[chainId]}`);
      const data = await response.json();
      const binaryData = [`0x${data.binary.data[0]}`];


      const result = await writeContract(config, {
        abi: jarContractAbi,
        address: jarAddress as `0x${string}`,
        functionName: 'withdraw',
        args: [
          withdrawAmount,
          withdrawNote,
          binaryData,
        ],
      })

      console.log('Native withdrawal successful', result);
    } catch (error) {
      console.error('Error withdrawing native token:', error);
    }
  };

  const vote = async (id: number, isUpvote: boolean) => {
    try {
      const result = await writeContract(config, {
        abi: jarContractAbi,
        address: jarAddress as `0x${string}`,
        functionName: 'voteOnWithdraw',
        args: [
          id,
          isUpvote,
        ],
      })

      console.log('Native withdrawal successful', result);
    } catch (error) {
      console.error('Error withdrawing native token:', error);
    }
  };

  return (
    <div>
      <a href="/">Home</a>
      <ConnectButton />
      <h1>Balance: {loading ? "..." : jarBalance} USD</h1>
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
          <button onClick={deposit} className={styles.modalButton}>Deposit Native</button>
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
          <button onClick={withdraw} className={styles.modalButton}>Withdraw Native</button>
        </div>
      </div>
      {loading ? (
          <p>Loading...</p>
        ) : error ? (
          <p>Error: {error}</p>
        ) : (
          <div className={styles.verticalAlign}>
            {operations.map((operation) => {
              return (
                <div key={`${operation.isDeposit ? "deposit-" : "withdraw-"}${operation.id}`} className={styles.card}>
                  <p><b>{operation.isDeposit ? "deposit" : "withdraw"}</b></p>
                  <p>user: {operation.user}</p>
                  <p>amount: {operation.amount} USD</p>
                  <p>{operation.note}</p>
                  {!operation.isDeposit && (
                    <div>
                      <p>score: {operation.score}</p>
                      <button onClick={() => vote(operation.id, true)}>
                        +
                      </button>
                      <button onClick={() => vote(operation.id, false)}>
                        -
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
    </div>
  );
};

export default Page;
