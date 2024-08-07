import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  base,
  celo,
  sepolia
} from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'Cookie Jar',
  projectId: 'a0423bd4d5dfb377c736fc030a4b2f93',
  chains: [
    base,
    celo,
    ...(process.env.NEXT_PUBLIC_ENABLE_TESTNETS === 'true' ? [sepolia] : []),
  ],
  ssr: true,
});