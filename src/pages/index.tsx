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
import {
  easAddress,
  jarContractAbi,
  priceFeedId,
  pythAddress,
  validChainIds,
} from '../lib/jar-contract-config';
import { Jar } from '../lib/types';
import { jarContractByteCode } from '../lib/jar-contract-bytecode';

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
            BigInt(newJar.withdrawLimit),
            BigInt(newJar.cooldownPeriod * 3600),
            easAddress[chainId] as `0x${string}`,
            pythAddress[chainId] as `0x${string}`,
            priceFeedId[chainId] as `0x${string}`,
          ],
          // bytecode: chainId == 42220 ? jarContractBytecodeCelo : jarContractBytecode,
          bytecode: jarContractByteCode,
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
