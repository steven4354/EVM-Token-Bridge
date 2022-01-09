import { Web3Provider } from "@ethersproject/providers";
import { Contract } from "@ethersproject/contracts";

import * as ERCABI from "../abis/ERC20ABI.json";

const ROPSTEN_NETWORK = "ropsten";

export const approveTokensTx = async (
  contractAddress: string,
  amount: number,
  selectedNetwork: string
) => {
  const provider = new Web3Provider(window.ethereum, "any");
  const currentNetwork = await provider.getNetwork();

  if (currentNetwork.name !== selectedNetwork) {
    // Prompt user for account connections
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();

    const contractToBeBridged = new Contract(contractAddress, ERCABI, signer);

    const routerAddress =
      currentNetwork.name === ROPSTEN_NETWORK
        ? process.env.REACT_APP_ROUTERROPSTEN_ADDRESS
        : process.env.REACT_APP_ROUTERRINKEBY_ADDRESS;
    let Tx: Object | undefined;
    try {
      Tx = await contractToBeBridged.approve(routerAddress, amount);
      return true;
    } catch (err) {
      if (Tx !== undefined) {
        throw new Error("Failed to approve ERC tokens!");
      }
    }
  }
  return false;
};

export default approveTokensTx;
