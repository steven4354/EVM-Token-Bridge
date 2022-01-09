import { Web3Provider } from "@ethersproject/providers";
import { Contract } from "@ethersproject/contracts";
import { parseEther } from "@ethersproject/units";
import * as RouterABI from "../abis/RoutersABI.json";

const ROPSTEN_NETWORK = "ropsten";

export const lockTokensTx = async (
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

    const routerAddress =
      currentNetwork.name === ROPSTEN_NETWORK
        ? process.env.REACT_APP_ROUTERROPSTEN_ADDRESS!
        : process.env.REACT_APP_ROUTERRINKEBY_ADDRESS!;

    let Tx: object | undefined;
    try {
      const RouterContract = new Contract(routerAddress, RouterABI, signer);
      const options = { value: parseEther("0.001") };
      // TODO: Could it work without the signerAddress ?
      Tx = await RouterContract.lockTokens(
        amount,
        contractAddress,
        options
      );
      return true;
      // await Tx.wait()
    } catch (err) {
      if (Tx !== undefined) {
        throw new Error("Failed to lock ERC tokens!");
      }
    }
  }
  return false;
};

export default lockTokensTx;
