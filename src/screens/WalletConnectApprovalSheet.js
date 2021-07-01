import { useRoute } from '@react-navigation/native';
import analytics from '@segment/analytics-react-native';
import { get } from 'lodash';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { InteractionManager, View } from 'react-native';
import { ContextMenuButton } from 'react-native-ios-context-menu';
import styled from 'styled-components';
import ChainLogo from '../components/ChainLogo';
import Divider from '../components/Divider';
import { Alert } from '../components/alerts';
import ButtonPressAnimation from '../components/animations/ButtonPressAnimation';
import { RequestVendorLogoIcon } from '../components/coin-icon';
import { ContactAvatar } from '../components/contacts';
import ImageAvatar from '../components/contacts/ImageAvatar';
import { Centered, Column, Row } from '../components/layout';
import {
  Sheet,
  SheetActionButton,
  SheetActionButtonRow,
} from '../components/sheet';
import { Text } from '../components/text';
import { useTheme } from '@rainbow-me/context';
import {
  getDappHostname,
  isDappAuthenticated,
} from '@rainbow-me/helpers/dappNameHandler';
import networkInfo from '@rainbow-me/helpers/networkInfo';
import networkTypes from '@rainbow-me/helpers/networkTypes';
import { useAccountProfile, useAccountSettings } from '@rainbow-me/hooks';
import { useNavigation } from '@rainbow-me/navigation';
import Routes from '@rainbow-me/routes';
import { ethereumUtils } from '@rainbow-me/utils';

const DappLogo = styled(RequestVendorLogoIcon).attrs(
  ({ theme: { colors } }) => ({
    backgroundColor: colors.transparent,
    borderRadius: 18,
    showLargeShadow: true,
    size: 60,
  })
)`
  margin-bottom: 24;
`;

const NetworkLabelText = styled(Text).attrs(({ theme: { colors } }) => ({
  color: colors.blueGreyDark,
  lineHeight: 17,
  size: 'lmedium',
}))`
  margin-bottom: 4;
`;

const NetworkText = styled(Text).attrs(() => ({
  lineHeight: 22,
  size: 'large',
  weight: 'heavy',
}))``;

const AvatarWrapper = styled(View).attrs(() => ({}))`
  margin-right: 5;
`;

const SwitchText = styled(Text).attrs(() => ({
  fontSize: 18,
  lineHeight: 22,
  weight: 'heavy',
}))`
  margin-left: 5;
`;

export const SavingsSheetEmptyHeight = 313;
export const SavingsSheetHeight = android ? 424 : 352;
export const WalletConnectApprovalSheetType = {
  connect: 1,
  switch_chain: 2,
};

export default function WalletConnectApprovalSheet() {
  const { colors } = useTheme();
  const { goBack } = useNavigation();
  const { params } = useRoute();
  const { network } = useAccountSettings();
  const [scam, setScam] = useState(false);
  const [approvalNetwork, setApprovalNetwork] = useState({
    color: get(networkInfo[network], 'color'),
    name: get(networkInfo[network], 'name'),
    value: get(networkInfo[network], 'value'),
  });

  const handled = useRef(false);
  const type = params?.type || WalletConnectApprovalSheetType.connect;
  const chainId = params?.chainId || 1;
  const meta = params?.meta || {};
  const { dappName, dappUrl, imageUrl } = meta;
  const callback = params?.callback;

  const {
    accountSymbol,
    accountColor,
    accountImage,
    accountENS,
    accountName,
  } = useAccountProfile();
  const { navigate } = useNavigation();
  const { isDarkMode } = useTheme();

  const checkIfScam = useCallback(
    async dappUrl => {
      const isScam = await ethereumUtils.checkIfUrlIsAScam(dappUrl);
      if (isScam) {
        Alert({
          buttons: [
            {
              text: 'Proceed Anyway',
            },
            {
              onPress: () => setScam(true),
              style: 'cancel',
              text: 'Ignore this request',
            },
          ],
          message:
            'We found this website in a list of malicious crypto scams.\n\n We recommend you to ignore this request and stop using this website immediately',
          title: ' 🚨 Heads up! 🚨',
        });
      }
    },
    [setScam]
  );

  const isAuthenticated = useMemo(() => {
    return isDappAuthenticated(dappUrl);
  }, [dappUrl]);

  const formattedDappUrl = useMemo(() => {
    return getDappHostname(dappUrl);
  }, [dappUrl]);

  const networksMenuItems = useMemo(
    () =>
      Object.values(networkInfo)
        .filter(({ disabled }) => !disabled)
        .map(netInfo => ({
          actionKey: `${netInfo.value}`,
          actionTitle: netInfo.name,
          icon: {
            iconType: 'ASSET',
            iconValue: `${netInfo.layer2 ? netInfo.value : 'ethereum'}Badge${
              isDarkMode ? 'Dark' : ''
            }`,
          },
        })),
    [isDarkMode]
  );

  const handleOnPressNetworksMenuItem = useCallback(
    ({ nativeEvent }) => {
      // const chainId = ethereumUtils.getChainIdFromNetwork(nativeEvent.actionKey);
      setApprovalNetwork({
        color: get(networkInfo[nativeEvent.actionKey], 'color'),
        name: get(networkInfo[nativeEvent.actionKey], 'name'),
        value: get(networkInfo[nativeEvent.actionKey], 'value'),
      });
    },
    [setApprovalNetwork]
  );

  const handleSuccess = useCallback(
    (success = false) => {
      if (callback) {
        setTimeout(() => callback(success), 300);
      }
    },
    [callback]
  );

  useEffect(() => {
    InteractionManager.runAfterInteractions(() => {
      analytics.track('Shown Walletconnect session request');
      type === WalletConnectApprovalSheetType.connect && checkIfScam(dappUrl);
    });
    // Reject if the modal is dismissed
    return () => {
      if (!handled.current) {
        handleSuccess(false);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConnect = useCallback(() => {
    handled.current = true;
    goBack();
    handleSuccess(true);
  }, [handleSuccess, goBack]);

  const handleCancel = useCallback(() => {
    handled.current = true;
    goBack();
    handleSuccess(false);
  }, [handleSuccess, goBack]);

  const handlePressChangeWallet = useCallback(() => {
    navigate(Routes.CHANGE_WALLET_SHEET);
  }, [navigate]);

  useEffect(() => {
    if (scam) {
      handleCancel();
    }
  }, [handleCancel, scam]);

  return (
    <Sheet hideHandle>
      <Centered
        direction="column"
        paddingBottom={5}
        paddingHorizontal={19}
        paddingTop={17}
        testID="wc-approval-sheet"
      >
        <DappLogo dappName={dappName || ''} imageUrl={imageUrl} />
        <Centered paddingHorizontal={24}>
          <Row>
            <Text
              align="center"
              color={colors.alpha(colors.blueGreyDark, 0.6)}
              lineHeight={29}
              size="big"
            >
              <Text color="dark" size="big" weight="bold">
                {dappName}
              </Text>{' '}
              {type === WalletConnectApprovalSheetType.connect
                ? `wants to connect to your wallet`
                : `wants to connect to the ${ethereumUtils.getNetworkNameFromChainId(
                    chainId
                  )} network`}
            </Text>
          </Row>
        </Centered>
        <Row marginBottom={30} marginTop={15}>
          <Text color="appleBlue" lineHeight={29} size="large" weight="bold">
            {isAuthenticated ? `􀇻 ${formattedDappUrl}` : formattedDappUrl}
          </Text>
        </Row>
        <Divider color={colors.rowDividerLight} inset={[0, 84]} />
      </Centered>
      <SheetActionButtonRow>
        <SheetActionButton
          color={colors.white}
          label="Cancel"
          onPress={handleCancel}
          size="big"
          textColor={colors.alpha(colors.blueGreyDark, 0.8)}
          weight="bold"
        />
        <SheetActionButton
          color={colors.appleBlue}
          label="Connect"
          onPress={handleConnect}
          size="big"
          testID="wc-connect"
          weight="bold"
        />
      </SheetActionButtonRow>
      <SheetActionButtonRow>
        <Column>
          <NetworkLabelText>Wallet</NetworkLabelText>
          <ButtonPressAnimation onPress={handlePressChangeWallet}>
            <Row>
              <AvatarWrapper>
                {accountImage ? (
                  <ImageAvatar image={accountImage} size="smaller" />
                ) : (
                  <ContactAvatar
                    color={isNaN(accountColor) ? colors.skeleton : accountColor}
                    size="smaller"
                    value={accountSymbol}
                  />
                )}
              </AvatarWrapper>
              <NetworkText numberOfLines={1}>
                {accountENS || accountName}
              </NetworkText>
              <SwitchText>􀁰</SwitchText>
            </Row>
          </ButtonPressAnimation>
        </Column>
        <Column align="flex-end">
          <NetworkLabelText>Network</NetworkLabelText>
          <ContextMenuButton
            activeOpacity={0}
            isMenuPrimaryAction
            menuConfig={{
              menuItems: networksMenuItems,
              menuTitle: 'Available Networks',
            }}
            onPressMenuItem={handleOnPressNetworksMenuItem}
            useActionSheetFallback={false}
            wrapNativeComponent={false}
          >
            <ButtonPressAnimation>
              <Row>
                <ChainLogo network={approvalNetwork.value} size={20} />
                <NetworkText color={approvalNetwork.color} numberOfLines={1}>
                  {approvalNetwork.value}
                </NetworkText>
                <SwitchText color={approvalNetwork.color}>􀁰</SwitchText>
              </Row>
            </ButtonPressAnimation>
          </ContextMenuButton>
        </Column>
      </SheetActionButtonRow>
    </Sheet>
  );
}
