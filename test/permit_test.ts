import { splitSignature } from "@ethersproject/bytes";


  export const permit = async function(
  chainId: number,
  nonce: number,
  name: any,
  tokenContract: string,
  owner: any,
  spenderAddress: string,
  amount: number,
  deadline: number,
) {
 
  const signerAddr = await owner.getAddress();

  const Permit = [
    { name: 'owner', type: 'address' },
    { name: 'spender', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ];
  const domain = {
    name: name,
    version: '1',
    chainId: chainId,
    verifyingContract: tokenContract,
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

export default permit