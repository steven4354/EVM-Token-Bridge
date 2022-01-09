import { Web3Provider } from "@ethersproject/providers";
import { Contract } from "@ethersproject/contracts";

import * as RouterABI from "../abis/RoutersABI.json";

const ROPSTEN_NETWORK = "ropsten";

export const releaseTokenTx = async (
  contractToBeReleasedAddr: string,
  amount: number
) => {
  const provider = new Web3Provider(window.ethereum, "any");

  const currentNetwork = await provider.getNetwork();

  const routerAddress =
    currentNetwork.name === ROPSTEN_NETWORK
      ? process.env.REACT_APP_ROUTERROPSTEN_ADDRESS!
      : process.env.REACT_APP_ROUTERRINKEBY_ADDRESS!;

  const signer = provider.getSigner();

  const RouterContract = new Contract(routerAddress, RouterABI, signer);

  let releaseTx: Object | undefined;
  try {
    releaseTx = await RouterContract.releaseTokens(
      contractToBeReleasedAddr,
      amount, {gasLimit: 300000}
    );
    // await releaseTx.wait()
    return true;
  } catch (err) {
    if (releaseTx !== undefined) {
      throw new Error("Releasing of ERC tokens failed!");
    }
    return false;
  }
};

export default releaseTokenTx;
