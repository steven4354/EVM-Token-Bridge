import { Web3Provider } from "@ethersproject/providers";
import { Contract } from "@ethersproject/contracts";

import * as ERCABI from "../abis/ERC20ABI.json";

export const unwrapTokensTx = async (
  amount: number,
  contractAddress: string,
  selectedNetwork: string
) => {
  const provider = new Web3Provider(window.ethereum, "any");

  const currentNetwork = await provider.getNetwork();

  if (currentNetwork.name !== selectedNetwork) {
    // Prompt user for account connections
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();

    let burnTx: Object | undefined;
    try {
      const ERCContract = new Contract(contractAddress, ERCABI, signer);
      burnTx = await ERCContract.burn(amount);
      return true;
    } catch (err) {
      if (burnTx !== undefined) {
        throw new Error("Failed to unwrap ERC tokens!");
      }
    }
  }
  return false;
};

export default unwrapTokensTx;
