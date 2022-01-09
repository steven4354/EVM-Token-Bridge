import { Contract } from "@ethersproject/contracts";
import { splitSignature } from "@ethersproject/bytes";

export const permit = async function(
  tokenContract: Contract,
  owner: any,
  spenderAddress: string,
  amount: string,
  library: any,
  deadline: number
) {
  const chain = await library.getNetwork();

  const signerAddr = await owner.getAddress();

  const nonce = await tokenContract.nonces(signerAddr);

  const Permit = [
    { name: "owner", type: "address" },
    { name: "spender", type: "address" },
    { name: "value", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ];
  const domain = {
    name: await tokenContract.name(),
    version: "1",
    chainId: chain.chainId,
    verifyingContract: tokenContract.address,
  };

  const message = {
    owner: signerAddr,
    spender: spenderAddress,
    value: amount,
    nonce: nonce,
    deadline: deadline,
  };

  const result = await owner._signTypedData(domain, { Permit }, message);
  return await splitSignature(result);
};

export default permit;
