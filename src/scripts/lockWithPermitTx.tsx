import { Web3Provider } from "@ethersproject/providers";
import { Contract } from "@ethersproject/contracts";
import { parseEther } from "@ethersproject/units";

import permit from "./permit";

import * as RouterABI from "../abis/RoutersABI.json";

import * as ERC20PermitABI from "../abis/ERC20PermitABI.json";

export const lockWithPermitTx = async (
  contractAddress: string,
  amount: string,
  selectedNetwork: string,
  library: any
) => {
  const ROPSTEN_NETWORK = "ropsten";

  const deadline = +new Date() + 60 * 60;

  const provider = new Web3Provider(window.ethereum, "any");
  const currentNetwork = await provider.getNetwork();

  if (currentNetwork.name !== selectedNetwork) {
    // Prompt user for account connections
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();

    const routerAddress =
      currentNetwork.name === ROPSTEN_NETWORK
        ? process.env.REACT_APP_ROUTERROPSTEN_ADDRESS
        : process.env.REACT_APP_ROUTERRINKEBY_ADDRESS;

    const routerContract = new Contract(routerAddress, RouterABI, signer);

    const ERCPermit = new Contract(contractAddress, ERC20PermitABI, signer);

    let Tx: Object | undefined;
    const options = { value: parseEther("0.001") };

    try {
      const permitSig = await permit(
        ERCPermit,
        signer,
        routerAddress,
        amount,
        library,
        deadline
      );

      await routerContract.lockTokens(
        amount,
        contractAddress,
        deadline,
        permitSig.v,
        permitSig.r,
        permitSig.s,
        options
      );

      return true;
    } catch (err) {
      if (Tx !== undefined) {
        throw new Error("Failed to Lock ERC tokens!");
      }
    }
  }
  return false;
};

export default lockWithPermitTx;
