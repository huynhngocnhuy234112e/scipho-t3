import { createConfig, http } from "wagmi";
import { zeroG } from "./chain";

export const config = createConfig({
  chains: [zeroG],
  transports: {
    [zeroG.id]: http(),
  },
});
