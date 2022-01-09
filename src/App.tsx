import * as React from "react";
import { useEffect, useState } from "react";

import styled from "styled-components";

import Web3Modal from "web3modal";
// @ts-ignore
import WalletConnectProvider from "@walletconnect/web3-provider";
import Column from "./components/Column";
import Wrapper from "./components/Wrapper";
import Header from "./components/Header";
import Loader from "./components/Loader";
import ConnectButton from "./components/ConnectButton";
import { getChainData } from "./helpers/utilities";

import BridgeComponent from "./components/BridgeComponent";

import { Web3Provider } from "@ethersproject/providers";

const SLayout = styled.div`
  position: relative;
  width: 100%;
  min-height: 100vh;
  text-align: center;
`;

const SContent = styled(Wrapper)`
  width: 100%;
  height: 100%;
  padding: 0 16px;
`;

const SContainer = styled.div`
  height: 100%;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  word-break: break-word;
`;

const SLanding = styled(Column)`
  height: 600px;
`;

// @ts-ignore
const SBalances = styled(SLanding)`
  height: 100%;
  & h3 {
    padding-top: 30px;
  }
`;

let web3Modal: Web3Modal;
const App = () => {
  const ROPSTEN_NETWORK = "ropsten";
  const RINKEBY_NETWORK = "rinkeby";

  const [provider, setProvider] = useState<any>();
  const [fetching, setFetching] = useState<boolean>(false);
  const [address, setAddress] = useState<string>("");
  const [connected, setConnected] = useState<boolean>(false);
  const [chainId, setChainId] = useState<number>(1);
  const [hasLocked, setHasLocked] = useState<boolean>(false);
  const [inNetworkToClaim, setInNetworkToClaim] = useState<boolean>(false);
  const [library, setLibrary] = useState<any>(null);

  // const [showClaim, setShowClaim] = useState<boolean>(false);

  useEffect(() => {
    createWeb3Modal();

    if (web3Modal.cachedProvider) {
      onConnect();
    }
  }, []);

  function createWeb3Modal() {
    web3Modal = new Web3Modal({
      network: getNetwork(),
      cacheProvider: true,
      providerOptions: getProviderOptions(),
    });
  }

  const onConnect = async () => {
    const provider = await web3Modal.connect();
    setProvider(provider);

    const library = new Web3Provider(provider);

    setLibrary(library);

    const network = await library.getNetwork();

    const address = provider.selectedAddress
      ? provider.selectedAddress
      : provider?.accounts[0];
    setChainId(network.chainId);
    setAddress(address);
    setConnected(true);

    await subscribeToProviderEvents(provider);
  };

  const subscribeToProviderEvents = async (provider: any) => {
    if (!provider.on) {
      return;
    }

    provider.on("accountsChanged", changedAccount);
    provider.on("networkChanged", networkChanged);
    provider.on("close", resetApp);

    await web3Modal.off("accountsChanged");
  };

  const unSubscribe = async (provider: any) => {
    // Workaround for metamask widget > 9.0.3 (provider.off is undefined);
    window.location.reload(false);
    if (!provider.off) {
      return;
    }

    provider.off("accountsChanged", changedAccount);
    provider.off("networkChanged", networkChanged);
    provider.off("close", resetApp);
  };

  const changedAccount = async (accounts: string[]) => {
    if (!accounts.length) {
      // Metamask Lock fire an empty accounts array
      await resetApp();
    } else {
      setAddress(accounts[0]);
    }
  };

  const networkChanged = async (networkId: number) => {
    const provider = await web3Modal.connect();
    setProvider(provider);

    const library = new Web3Provider(provider);

    setLibrary(library);

    // const provider = new Web3Provider(window.ethereum, "any");
    const network = await library.getNetwork();

    const signer = library.getSigner();
    const signerAddress = await signer.getAddress();

    const hasLockedInNetwork = localStorage.getItem(signerAddress);

    /* Next line checks whether this user has locked any tokens:
     If yes and in ropsten, then user should be connected to rinkeby, and vice versa */
    if (
      (hasLockedInNetwork === ROPSTEN_NETWORK &&
        network.name === RINKEBY_NETWORK) ||
      (hasLockedInNetwork === RINKEBY_NETWORK &&
        network.name === ROPSTEN_NETWORK)
    ) {
      setHasLocked(true);
      setInNetworkToClaim(true);
    } else if (
      /* However if he has locked any but is not connected to the opposite network, set flag to false (used to make `Claim` button active) */
      (hasLockedInNetwork === ROPSTEN_NETWORK &&
        network.name === ROPSTEN_NETWORK) ||
      (hasLockedInNetwork === RINKEBY_NETWORK &&
        network.name === RINKEBY_NETWORK)
    ) {
      setHasLocked(true);
      setInNetworkToClaim(false);
    }
  };

  function getNetwork() {
    return getChainData(chainId).network;
  }

  function getProviderOptions() {
    const providerOptions = {
      walletconnect: {
        package: WalletConnectProvider,
        options: {
          infuraId: process.env.REACT_APP_INFURA_ID,
        },
      },
    };
    return providerOptions;
  }

  const resetApp = async () => {
    await web3Modal.clearCachedProvider();
    localStorage.removeItem("WEB3_CONNECT_CACHED_PROVIDER");
    localStorage.removeItem("walletconnect");
    await unSubscribe(provider);
  };

  const resetState = () => {
    setFetching(false);
    setAddress("");
    setConnected(false);
    setChainId(1);
  };

  const getLibrary = () => {
    return library;
  };

  /* Checks whether tokens have been locked/unwrapped upon page refresh */
  useEffect(() => {
    window.addEventListener("beforeunload", alertUser);
    async function checkLockedTokens() {
      const provider = new Web3Provider(window.ethereum, "any");
      const signer = provider.getSigner();
      const signerAddress = await signer.getAddress();
      const hasLocked = localStorage.getItem(signerAddress);
      const network = await provider.getNetwork();
      if (
        (hasLocked === ROPSTEN_NETWORK && network.name === RINKEBY_NETWORK) ||
        (hasLocked === RINKEBY_NETWORK && network.name === ROPSTEN_NETWORK)
      ) {
        setHasLocked(true);
        setInNetworkToClaim(true);
      }
    }
    checkLockedTokens();
    return () => {
      window.removeEventListener("beforeunload", alertUser);
    };
  }, []);
  const alertUser = (e: any) => {
    e.preventDefault();
  };

  return (
    <SLayout>
      <Column maxWidth={1000} spanHeight>
        <Header
          connected={connected}
          address={address}
          chainId={chainId}
          killSession={resetApp}
        />
        {connected && <BridgeComponent
          onArrow={() => {
            setHasLocked(false);
            setInNetworkToClaim(false);
          }}
          hasLocked={hasLocked}
          inNetworkToClaim={inNetworkToClaim}
          library={library}
          getLibrary={getLibrary}
        />
        }
        <SContent>
          {fetching ? (
            <Column center>
              <SContainer>
                <Loader />
              </SContainer>
            </Column>
          ) : (
            <SLanding center>
              {!connected && <ConnectButton onClick={onConnect} />}
            </SLanding>
          )}
        </SContent>
      </Column>
    </SLayout>
  );
};
export default App;
