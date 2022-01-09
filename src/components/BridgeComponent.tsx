import * as React from "react";
import { useEffect, useState } from "react";

import { FormGroup, Label, Input, Select } from "../Forms";
import Button from "./Button";
import ClaimForm from "./ClaimForm";

import lockWithPermitTx from "../scripts/lockWithPermitTx";
import unwrapTokensTx from "../scripts/unwrap";

import { Web3Provider } from "@ethersproject/providers";
import { Contract } from "@ethersproject/contracts";
import { isAddress } from "@ethersproject/address";

import * as ERCABI from "../abis/ERC20ABI.json";
import * as RouterABI from "../abis/RoutersABI.json";

const BridgeComponent = (props: any) => {
  const ROPSTEN_NETWORK = "ropsten";
  const RINKEBY_NETWORK = "rinkeby";
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

  const [provider, setProvider] = useState<any>(
    new Web3Provider(window.ethereum, "any")
  );
  const [signer, setSigner] = useState<any>(provider.getSigner());
  const [routerAddress, setRouterAddress] = useState<string>("");

  const [amount, setAmount] = useState<number>(0);
  const [tokenAddress, setTokenAddress] = useState<string>("");
  const [currentNetwork, setCurrentNetwork] = useState<string>("");
  const [selectedNetwork, setSelectedNetwork] = useState<string>("");

  const [isValidAddress, setIsValidAddress] = useState<boolean>(false);

  const [allowanceAmount, setAllowanceAmount] = useState<number>(0);

  const [notDeployed, setNotDeployed] = useState<boolean>(false);

  const [hasLocked, setHasLocked] = useState<boolean>(false);
  const [hasUnwrapped, setHasUnwrapped] = useState<boolean>(false);
  const [hasClaimed, setHasClaimed] = useState<boolean>(false);

  const [showClaimForm, setShowClaimForm] = useState<boolean>(false);

  const [amountWrappedTokens, setAmountWrappedTokens] = useState<number>(0);
  const [txDetails, settxDetails] = useState<string>("");

  const [pendingState, setPendingState] = useState<boolean>(false);

  useEffect(() => {
    async function loadNetworkData() {
      const network = await provider.getNetwork();
      if (network.name === ROPSTEN_NETWORK) {
        setCurrentNetwork(ROPSTEN_NETWORK);
        setSelectedNetwork(RINKEBY_NETWORK);
      } else if (network.name === RINKEBY_NETWORK) {
        setCurrentNetwork(RINKEBY_NETWORK);
        setSelectedNetwork(ROPSTEN_NETWORK);
      }

      const routerAddress =
        network.name === ROPSTEN_NETWORK
          ? process.env.REACT_APP_ROUTERROPSTEN_ADDRESS
          : process.env.REACT_APP_ROUTERRINKEBY_ADDRESS;
      setRouterAddress(routerAddress);
    }
    loadNetworkData();
  });

  /* Returns true if the ERC20 token is a wrapped version of some native ERC20 token */
  const contractIsWrappedToken = async (contractAddress: string) => {
    const signerAddress = await signer.getAddress();

    const RouterContract = new Contract(routerAddress, RouterABI, signer);
    const amountOfWrappedTokens = await RouterContract.getTokensClaimedAmount(
      contractAddress,
      signerAddress
    );
    if (amountOfWrappedTokens.toNumber() > 0) {
      setAmountWrappedTokens(amountOfWrappedTokens.toNumber());
      return true;
    } else {
      return false;
    }
  };

  /* Checks whether the signer has allowed the Router Contract to spend its funds */
  const checkContractAllowance = async (contractAddress: string) => {
    try {
      const signerAddress = await signer.getAddress();

      const contractToBeBridged = new Contract(contractAddress, ERCABI, signer);
      const allowance = await contractToBeBridged.allowance(
        signerAddress,
        routerAddress
      );
      setAllowanceAmount(allowance.toNumber());
      setAmountWrappedTokens(0);
      setNotDeployed(false);
    } catch (e) {
      if (contractAddress) {
        const code = await provider.getCode(contractAddress);
        if (code === "0x") {
          setNotDeployed(true);
          setAllowanceAmount(-1);
          setIsValidAddress(
            false
          ); /* Address is valid but contract is not deployed which makes it not useful */
        } else {
          setNotDeployed(false);
        }
      }
    }
  };

  const subscribeToERCContractEvents = async (tokenAddress: string) => {
    if (isAddress(tokenAddress)) {
      const network = await provider.getNetwork();

      const ERCContract = new Contract(tokenAddress, ERCABI, provider);
      const signerAddress = await signer.getAddress();

      /* Handles Burn and Lock events */
      await ERCContract.on("Transfer", (from, to, value, event) => {
        if (to === ZERO_ADDRESS) {
          const currentNetwork = network.name;
          localStorage.setItem(from, currentNetwork);
          setHasUnwrapped(true);
          setHasLocked(false);
          setTokenAddress("0x");
          setAmountWrappedTokens(0);
        } else if (from === signerAddress && to === routerAddress) {
          localStorage.setItem(signerAddress, network.name);
          setShowClaimForm(false);
          setHasLocked(true);
          setAllowanceAmount(0);
        }
        setPendingState(false);
        settxDetails("Transaction " + event.transactionHash + " validated!");
      });
    }
  };

  const onChangeTokenAddress = async (e: any) => {
    const addr = e.target.value;
    setTokenAddress(addr);
    if (isAddress(addr)) {
      setIsValidAddress(true);
      checkContractAllowance(addr);
      contractIsWrappedToken(addr);
      await subscribeToERCContractEvents(addr);
    } else {
      setIsValidAddress(false);
    }
  };

  const fetchUserBalance = async () => {
    const signerAddress = await signer.getAddress();
    const ERCContract = new Contract(tokenAddress, ERCABI, provider);
    const balance = await ERCContract.balanceOf(signerAddress);
    if (allowanceAmount === 0) {
      setAmount(balance.toNumber());
    } else {
      setAmount(allowanceAmount);
    }
  };

  const onBridge = async (amount, tokenAddress, selectedNetwork) => {
    settxDetails("");
    await lockWithPermitTx(
      tokenAddress,
      amount,
      selectedNetwork,
      props.library
    ).then((result) => {
      result ? setPendingState(true) : setPendingState(false);
    });
  };

  const onUnwrap = async (amount, tokenAddress, selectedNetwork) => {
    settxDetails("");
    await unwrapTokensTx(amount, tokenAddress, selectedNetwork).then(
      (result) => {
        result ? setPendingState(true) : setPendingState(false);
      }
    );
  };

  const onArrow = async () => {
    setShowClaimForm(false);
    setHasLocked(false);
    setHasUnwrapped(false);
    props.onArrow();
    settxDetails("");
  };

  const onClaim = async () => {
    setHasLocked(false);
    setHasClaimed(true);
  };

  const onTransferBack = async () => {
    setHasUnwrapped(false);
  };

  if (!showClaimForm) {
    return (
      <div id="bridgeForm">
        <FormGroup>
          <Button
            outline={true}
            color="palevioletred"
            disabled={
              !((props.hasLocked || hasUnwrapped) && props.inNetworkToClaim)
            }
            onClick={() => setShowClaimForm(true)}
          >
            Claim
          </Button>
          <Label htmlFor="label">Select a target chain</Label>
          <Select
            value={
              currentNetwork === ROPSTEN_NETWORK
                ? RINKEBY_NETWORK
                : ROPSTEN_NETWORK
            }
            onChange={(e) => setSelectedNetwork(e.target.value)}
          >
            <option value={ROPSTEN_NETWORK}>Ropsten</option>
            <option value={RINKEBY_NETWORK}>Rinkeby</option>
          </Select>
        </FormGroup>
        <FormGroup>
          <Label htmlFor="label">Enter a valid ERC-20 token address</Label>
          <Input
            id="bridgetoken"
            onInput={(event) => onChangeTokenAddress(event)}
          />
        </FormGroup>
        <FormGroup>
          <Label>Amount</Label>
          <div id="input-group" style={{ display: "flex" }}>
            <Input
              id="amount"
              style={{ flex: "1" }}
              onChange={(event) =>
                setAmount(
                  !isNaN(parseInt(event.target.value, 10))
                    ? parseInt(event.target.value, 10)
                    : 0
                )
              }
              value={amount}
            />
            <Button
              disabled={!isValidAddress}
              outline={true}
              color="palevioletred"
              type="submit"
              onClick={() => fetchUserBalance()}
            >
              Max
            </Button>
          </div>
        </FormGroup>
        <FormGroup>
          {amountWrappedTokens > 0 && (
            <Button
              onClick={() => onUnwrap(amount, tokenAddress, selectedNetwork)}
            >
              Unwrap
            </Button>
          )}
          {!(amountWrappedTokens > 0) &&
            isValidAddress && allowanceAmount === 0 && (
              <Button
                disabled={amountWrappedTokens > 0 ? true : false}
                onClick={() => onBridge(amount, tokenAddress, selectedNetwork)}
              >
                Transfer
              </Button>
            )}
        </FormGroup>
        <div id="transactionInfo">
          {pendingState && <Label>Transaction pending...</Label>}
          {(hasUnwrapped || hasLocked) && (
            <Label>
              {!pendingState && txDetails !== "" && (
                <img src={require("./b-tick.jpg")}></img>
              )}{" "}
              {txDetails}{" "}
            </Label>
          )}
          {currentNetwork === selectedNetwork && (
            <Label>The target should be the opposite chain!</Label>
          )}
          {notDeployed && !isValidAddress && (
            <Label id="contractDeployed"> Contract not deployed! </Label>
          )}
        </div>
      </div>
    );
  } else {
    return (
      <ClaimForm
        onClaim={onClaim}
        onArrow={onArrow}
        contractAddr={tokenAddress}
        amount={amount}
        hasLocked={hasLocked}
        hasUnwrapped={hasUnwrapped}
        onTransferBack={onTransferBack}
        getLibrary={props.getLibrary}
      />
    );
  }
};

export default BridgeComponent;
