import { Web3Provider } from "@ethersproject/providers";
import { Contract } from "@ethersproject/contracts";
import { keccak256 } from "@ethersproject/solidity";
import { arrayify } from "@ethersproject/bytes";

import * as RouterABI from "../abis/RoutersABI.json";

const ROPSTEN_NETWORK = "ropsten";

export const claimTokensTx = async (
  contractAddress: string,
  amount: number
) => {
  const provider = new Web3Provider(window.ethereum, "any");

  const currentNetwork = await provider.getNetwork();

  await provider.send("eth_requestAccounts", []);

  const signer = provider.getSigner();

  const routerAddress =
    currentNetwork.name === ROPSTEN_NETWORK
      ? process.env.REACT_APP_ROUTERROPSTEN_ADDRESS!
      : process.env.REACT_APP_ROUTERRINKEBY_ADDRESS!;

  let signedMessageTx: Object | undefined;
  let claimTokensTx: Object | undefined;
  try {
    const RouterContract = new Contract(routerAddress, RouterABI, signer);

    const messageToSign = "Yes, I want to claim tokens!";

    const messageHash = keccak256(["string"], [messageToSign]);
    const arrayifyHash = arrayify(messageHash);

    signedMessageTx = await signer.signMessage(arrayifyHash);

    const signerAddress = await signer.getAddress();

    claimTokensTx = await RouterContract.claimTokens(
      messageHash,
      signedMessageTx,
      contractAddress,
      amount
    );
    localStorage.removeItem(signerAddress);
    return true;
  } catch (err) {
    if (signedMessageTx !== undefined || claimTokensTx !== undefined) {
      throw new Error("Claiming ERC tokens failed!");
    }
    return false;
  }
};

export default claimTokensTx;
