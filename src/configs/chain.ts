import { defineChain } from "viem";

export const zeroG = defineChain({
  id: 16601,
  name: "0G Galileo Testnet",
  nativeCurrency: { name: "0G", symbol: "0G", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://evmrpc-testnet.0g.ai"],
    },
  },
  blockExplorers: {
    default: {
      name: "0G BlockChain Explorer",
      url: "https://chainscan-galileo.0g.ai",
    },
  },
  testnet: true,
});
