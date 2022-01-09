import { Web3Provider } from "@ethersproject/providers";
import { Contract } from "@ethersproject/contracts";

import * as ERCABI from "../abis/ERC20ABI.json";

const ROPSTEN_NETWORK = "ropsten";

export const transferRouterUserTx = async (
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

  const signerAddress = await signer.getAddress();

  const releaseContract = new Contract(
    contractToBeReleasedAddr,
    ERCABI,
    signer
  );

  let transferFromTx: Object | undefined;
  try {
    transferFromTx = await releaseContract.transferFrom(
      routerAddress,
      signerAddress,
      amount
    );
    // await transferFromTx.wait()
    localStorage.removeItem(signerAddress);
    return true;
  } catch (err) {
    if (transferFromTx !== undefined) {
      throw new Error("Releasing of ERC tokens failed!");
    }
    return false;
  }
};

export default transferRouterUserTx;
