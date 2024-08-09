import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  base,
  celo,
  celoAlfajores,
  sepolia,
  baseSepolia,
  optimismSepolia,
  optimism,
  metalL2
} from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'Cookie Jar',
  projectId: 'a0423bd4d5dfb377c736fc030a4b2f93',
  chains: [
    sepolia,
    baseSepolia,
    optimismSepolia,
    celoAlfajores,
    optimism,
    base,
    celo,
    ...(process.env.NEXT_PUBLIC_ENABLE_TESTNETS === 'true' ? [sepolia] : []),
  ],
  ssr: true,
});