'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ban } from 'lucide-react';
import { toast } from 'sonner';
import { Localize } from '@deriv-com/translations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Footer, FooterBar } from '@/components/custom/footer';
import { Header } from '@/components/custom/header';
import { LoginPromptDialog } from '@/components/custom/login-prompt-dialog';
import { PinnedBuyBar } from '@/components/custom/pinned-buy-bar';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useAppTranslations } from '@/components/custom/i18n-provider';
import { CurrentTickDisplay } from './current-tick-display';
import { DigitStatsBar } from './digit-stats-bar';
import { TradeControls } from './trade-controls';
import { ConfigurableDigitsControls, ConfigurableBuyButton } from './configurable-digits-controls';
import { TradeTypeChips } from '@/components/custom/trade-type-chips';
import { SymbolSelector } from '@/components/custom/symbol-selector';
import { ThemeToggle } from '@/components/custom/theme-toggle';
import type {
  AuthState,
  DerivAccount,
  ActiveSymbol,
  Tick,
  ProposalInfo,
  DurationLimits,
  BuyResult,
} from '@deriv/core';
import type { ContractMode, TradeType, DigitStats } from '../lib/types';
import { ALL_CONTROL_KEYS } from '../lib/app-config';
import type { ControlKey, DigitsAppConfig } from '../lib/app-config';

const MARKET_COLUMN_KEYS: ControlKey[] = ['symbol', 'tick', 'digitStats'];
const CONTROLS_COLUMN_KEYS: ControlKey[] = ALL_CONTROL_KEYS.filter(
  (key) => !MARKET_COLUMN_KEYS.includes(key)
);

function getDigitTradeTypeOptions(
  localize: (text: string) => string
): { value: TradeType; label: string }[] {
  return [
    { value: 'matches-differs', label: localize('Matches/Differs') },
    { value: 'over-under', label: localize('Over/Under') },
    { value: 'even-odd', label: localize('Even/Odd') },
  ];
}

const noopAsyncAuth = async () => {};

export interface DigitsViewProps {
  authState: AuthState;
  accounts: DerivAccount[];
  activeAccount: DerivAccount | null;
  onLogin: () => Promise<void>;
  onSignUp: () => Promise<void>;
  onLogout: () => void;
  onSwitchAccount: (accountId: string) => Promise<void>;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  symbols: ActiveSymbol[];
  activeSymbol: ActiveSymbol | null;
  selectSymbol: (symbol: string) => void;
  currentTick: Tick | null;
  lastDigit: number | null;
  digitStats: DigitStats;
  pipSize: number;
  tradeType: TradeType;
  setTradeType: (type: TradeType) => void;
  contractMode: ContractMode;
  setContractMode: (mode: ContractMode) => void;
  selectedDigit: number;
  setSelectedDigit: (digit: number) => void;
  stake: string;
  setStake: (value: string) => void;
  duration: number;
  setDuration: (value: number) => void;
  durationLimits: DurationLimits;
  proposal: ProposalInfo | null;
  isProposalLoading: boolean;
  buyContract: () => Promise<void>;
  isBuying: boolean;
  buyResult: BuyResult | null;
  buyError: string | null;
  clearBuyResult: () => void;
  martingaleMultiplier: number;
  setMartingaleMultiplier: (value: number) => void;
  stakeBareMultiplier: number;
  setStakeBareMultiplier: (value: number) => void;
  stakeMode: 'standard' | 'stake-bare';
  setStakeMode: (value: 'standard' | 'stake-bare') => void;
  takeProfit: string;
  setTakeProfit: (value: string) => void;
  stopLoss: string;
  setStopLoss: (value: string) => void;
  sessionPnl: number;
  effectiveStake: number;
  riskBlocked: boolean;
  resetSessionPnl: () => void;
  logoSrc?: string;
  appName?: string;
  showAppName?: boolean;
  appConfig?: DigitsAppConfig;
  editMode?: boolean;
  onSelect?: (key: string) => void;
  selectedKey?: string | null;
  rearrangeMode?: boolean;
  onReorder?: (order: DigitsAppConfig['order']) => void;
}

export function DigitsView({
  authState,
  accounts,
  activeAccount,
  onLogin,
  onSignUp,
  onLogout,
  onSwitchAccount,
  isConnected,
  isLoading,
  error,
  symbols,
  activeSymbol,
  selectSymbol,
  currentTick,
  lastDigit,
  digitStats,
  pipSize,
  tradeType,
  setTradeType,
  contractMode,
  setContractMode,
  selectedDigit,
  setSelectedDigit,
  stake,
  setStake,
  duration,
  setDuration,
  durationLimits,
  proposal,
  isProposalLoading,
  buyContract,
  isBuying,
  buyResult,
  buyError,
  clearBuyResult,
  martingaleMultiplier,
  setMartingaleMultiplier,
  stakeBareMultiplier,
  setStakeBareMultiplier,
  stakeMode,
  setStakeMode,
  takeProfit,
  setTakeProfit,
  stopLoss,
  setStopLoss,
  sessionPnl,
  effectiveStake,
  riskBlocked,
  resetSessionPnl,
  logoSrc,
  appName,
  showAppName,
  appConfig,
  editMode,
  onSelect,
  selectedKey,
  rearrangeMode,
  onReorder,
}: DigitsViewProps) {
  const isMobile = useIsMobile();
  const pinBuy = !!appConfig?.buy?.pinned && isMobile;
  const inFlowFooter = !!appConfig && isMobile;
  const { localize } = useAppTranslations();
  const digitTradeTypeOptions = getDigitTradeTypeOptions(localize);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const handleBuy = useCallback(async () => {
    if (editMode) return;
    if (authState === 'authenticating') return;
    if (riskBlocked) {
      toast.error(localize('Risk guard active'), {
        description: localize('Session P/L has hit the configured stop loss or take profit threshold.'),
      });
      return;
    }
    if (authState !== 'authenticated') {
      setShowLoginPrompt(true);
      return;
    }
    await buyContract();
  }, [editMode, authState, buyContract, riskBlocked, localize]);

  const hasAppConfig = !!appConfig;
  useEffect(() => {
    if (!hasAppConfig || !buyError) return;
    toast.error(localize('Purchase Failed'), { description: buyError });
    clearBuyResult();
  }, [hasAppConfig, buyError, clearBuyResult, localize]);
  useEffect(() => {
    if (!hasAppConfig || !buyResult) return;
    toast.success(localize('Contract Purchased'), {
      description: localize(
        'Buy price: {{buyPrice}} USD | Payout: {{payout}} USD | Balance: {{balance}} USD',
        {
          buyPrice: buyResult.buyPrice.toFixed(2),
          payout: buyResult.payout.toFixed(2),
          balance: buyResult.balanceAfter.toFixed(2),
        }
      ),
    });
    clearBuyResult();
  }, [hasAppConfig, buyResult, clearBuyResult, localize]);

  const headerEl = useMemo(() => {
    const noop = () => {};
    const noopAsync = async () => {};
    return (
      <Header
        authState={authState}
        accounts={accounts}
        activeAccount={activeAccount}
        onLogin={editMode ? noopAsync : onLogin}
        onSignUp={editMode ? noopAsync : onSignUp}
        onLogout={editMode ? noop : onLogout}
        onSwitchAccount={editMode ? noopAsync : onSwitchAccount}
        logoSrc={logoSrc}
        appName={appName}
        showAppName={showAppName}
        actions={<ThemeToggle />}
      />
    );
  }, [
    authState,
    accounts,
    activeAccount,
    editMode,
    onLogin,
    onSignUp,
    onLogout,
    onSwitchAccount,
    logoSrc,
    appName,
    showAppName,
  ]);

  if (error) {
    return (
      <main className="flex flex-col bg-background items-center justify-center px-4 min-h-dvh">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-destructive">
              <Localize i18n_default_text="Connection Error" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  const renderConfigurable = (keys?: ControlKey[], showPositionsLink?: boolean) =>
    appConfig ? (
      <ConfigurableDigitsControls
        config={appConfig}
        keys={keys}
        showPositionsLink={showPositionsLink}
        symbols={symbols}
        activeSymbol={activeSymbol}
        selectSymbol={selectSymbol}
        currentTick={currentTick}
        lastDigit={lastDigit}
        digitStats={digitStats}
        pipSize={pipSize}
        tradeType={tradeType}
        onTradeTypeChange={setTradeType}
        contractMode={contractMode}
        onContractModeChange={setContractMode}
        selectedDigit={selectedDigit}
        onDigitSelect={setSelectedDigit}
        stake={stake}
        onStakeChange={setStake}
        duration={duration}
        onDurationChange={setDuration}
        durationLimits={durationLimits}
        proposal={proposal}
        isProposalLoading={isProposalLoading}
        onBuy={handleBuy}
        isBuying={isBuying}
        isConnected={isConnected}
        isAuthenticated={authState === 'authenticated'}
        editMode={editMode}
        onSelect={onSelect}
        selectedKey={selectedKey}
        rearrangeMode={rearrangeMode}
        onReorder={onReorder}
        pinBuy={pinBuy}
      />
    ) : null;

  return (
    <main
      className={`flex flex-col max-lg:h-dvh max-lg:overflow-y-auto lg:overflow-visible ${
        editMode ? 'bg-muted/50' : 'bg-background'
      }`}
    >
      {editMode ? (
        <div className="group/hdr sticky top-0 z-50">
          {headerEl}
          <div className="pointer-events-none absolute inset-0 z-[60] opacity-0 ring-2 ring-inset ring-muted-foreground/25 transition-opacity group-hover/hdr:opacity-100">
            <span className="absolute left-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5 rounded-md bg-background/90 px-2 py-1 text-[11px] font-medium text-muted-foreground shadow-sm ring-1 ring-border">
              <Ban className="h-3.5 w-3.5" />
              <Localize i18n_default_text="Not editable" />
            </span>
          </div>
        </div>
      ) : (
        headerEl
      )}

      {appConfig ? (
        isMobile ? (
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
            <div className="mx-auto flex w-full max-w-md flex-col gap-3 px-3 py-3">
              {isLoading ? <Skeleton className="h-[420px] w-full rounded-xl" /> : renderConfigurable()}
            </div>
          </div>
        ) : (
          <div className="flex w-full max-w-5xl mx-auto flex-col px-4 py-4 pb-24">
            {isLoading ? (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_440px]">
                <Skeleton className="h-[420px] w-full rounded-xl" />
                <Skeleton className="h-[420px] w-full rounded-xl" />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_440px]">
                <Card data-testid="market-column">
                  <CardContent className="pt-4">
                    {renderConfigurable(MARKET_COLUMN_KEYS, false)}
                  </CardContent>
                </Card>
                <Card data-testid="controls-column">
                  <CardContent className="pt-4">
                    {renderConfigurable(CONTROLS_COLUMN_KEYS)}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )
      ) : isMobile ? (
        <div className="flex w-full max-w-7xl mx-auto flex-col px-3 py-2 sm:px-4 sm:py-4 gap-2 sm:gap-3 pb-10">
          {isLoading ? (
            <>
              <div className="flex gap-2">
                <Skeleton className="h-8 w-32 rounded-full" />
                <Skeleton className="h-8 w-28 rounded-full" />
                <Skeleton className="h-8 w-24 rounded-full" />
              </div>
              <Skeleton className="w-full h-[420px] rounded-xl" />
            </>
          ) : (
            <>
              <TradeTypeChips
                className="shrink-0"
                value={tradeType}
                options={digitTradeTypeOptions}
                onValueChange={setTradeType}
              />

              <Card className="shrink-0 border shadow-sm mb-12">
                <CardContent className="flex flex-col p-3 pt-3 sm:p-6 sm:pt-4 pb-2 sm:pb-6">
                  <div className="flex flex-col pb-4 pt-1 sm:pb-6 sm:pt-2">
                    <SymbolSelector
                      symbols={symbols}
                      activeSymbol={activeSymbol}
                      onSymbolChange={selectSymbol}
                    />
                    <div className="flex items-center justify-center min-h-24 sm:min-h-32">
                      <CurrentTickDisplay
                        tick={currentTick}
                        lastDigit={lastDigit}
                        activeSymbol={activeSymbol}
                        pipSize={pipSize}
                      />
                    </div>
                  </div>

                  <div className="border-t divide-y divide-border">
                    {tradeType !== 'even-odd' && (
                      <div className="py-4 sm:py-6">
                        <DigitStatsBar
                          digitStats={digitStats}
                          selectedDigit={selectedDigit}
                          onDigitSelect={setSelectedDigit}
                        />
                      </div>
                    )}

                    <div className="pt-4 sm:pt-6">
                      <TradeControls
                        tradeType={tradeType}
                        contractMode={contractMode}
                        onContractModeChange={setContractMode}
                        selectedDigit={selectedDigit}
                        isConnected={isConnected}
                        stake={stake}
                        onStakeChange={setStake}
                        duration={duration}
                        onDurationChange={setDuration}
                        durationLimits={durationLimits}
                        proposal={proposal}
                        isProposalLoading={isProposalLoading}
                        onBuy={handleBuy}
                        isBuying={isBuying}
                        buyResult={buyResult}
                        buyError={buyError}
                        onClearBuyResult={clearBuyResult}
                        isAuthenticated={authState === 'authenticated'}
                        isMobile
                        martingaleMultiplier={martingaleMultiplier}
                        setMartingaleMultiplier={setMartingaleMultiplier}
                        stakeBareMultiplier={stakeBareMultiplier}
                        setStakeBareMultiplier={setStakeBareMultiplier}
                        stakeMode={stakeMode}
                        setStakeMode={setStakeMode}
                        takeProfit={takeProfit}
                        setTakeProfit={setTakeProfit}
                        stopLoss={stopLoss}
                        setStopLoss={setStopLoss}
                        sessionPnl={sessionPnl}
                        effectiveStake={effectiveStake}
                        riskBlocked={riskBlocked}
                        resetSessionPnl={resetSessionPnl}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      ) : (
        <div className="flex w-full max-w-5xl mx-auto flex-col px-4 py-4 pb-24">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_440px]">
              <Skeleton className="h-[420px] w-full rounded-xl" />
              <Skeleton className="h-[420px] w-full rounded-xl" />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_440px]">
              <Card data-testid="market-column">
                <CardContent className="flex flex-col gap-4 pt-4">
                  <SymbolSelector
                    symbols={symbols}
                    activeSymbol={activeSymbol}
                    onSymbolChange={selectSymbol}
                  />
                  <div className="flex flex-1 items-center justify-center min-h-32">
                    <CurrentTickDisplay
                      tick={currentTick}
                      lastDigit={lastDigit}
                      activeSymbol={activeSymbol}
                      pipSize={pipSize}
                    />
                  </div>
                  {tradeType !== 'even-odd' && (
                    <DigitStatsBar
                      digitStats={digitStats}
                      selectedDigit={selectedDigit}
                      onDigitSelect={setSelectedDigit}
                    />
                  )}
                </CardContent>
              </Card>
              <Card data-testid="controls-column">
                <CardContent className="flex flex-col gap-4 pt-4">
                  <TradeTypeChips
                    backdrop="card"
                    value={tradeType}
                    options={digitTradeTypeOptions}
                    onValueChange={setTradeType}
                  />
                  <TradeControls
                    tradeType={tradeType}
                    contractMode={contractMode}
                    onContractModeChange={setContractMode}
                    selectedDigit={selectedDigit}
                    isConnected={isConnected}
                    stake={stake}
                    onStakeChange={setStake}
                    duration={duration}
                    onDurationChange={setDuration}
                    durationLimits={durationLimits}
                    proposal={proposal}
                    isProposalLoading={isProposalLoading}
                    onBuy={handleBuy}
                    isBuying={isBuying}
                    buyResult={buyResult}
                    buyError={buyError}
                    onClearBuyResult={clearBuyResult}
                    isAuthenticated={authState === 'authenticated'}
                    martingaleMultiplier={martingaleMultiplier}
                    setMartingaleMultiplier={setMartingaleMultiplier}
                    stakeBareMultiplier={stakeBareMultiplier}
                    setStakeBareMultiplier={setStakeBareMultiplier}
                    stakeMode={stakeMode}
                    setStakeMode={setStakeMode}
                    takeProfit={takeProfit}
                    setTakeProfit={setTakeProfit}
                    stopLoss={stopLoss}
                    setStopLoss={setStopLoss}
                    sessionPnl={sessionPnl}
                    effectiveStake={effectiveStake}
                    riskBlocked={riskBlocked}
                    resetSessionPnl={resetSessionPnl}
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {pinBuy ? (
        <PinnedBuyBar
          editMode={editMode}
          rearrangeMode={rearrangeMode}
          selected={selectedKey === 'buy'}
          onSelect={() => onSelect?.('buy')}
          label={localize('Buy button')}
        >
          <ConfigurableBuyButton
            variant={appConfig!.styles.buy}
            isConnected={isConnected}
            proposal={proposal}
            onBuy={handleBuy}
            isBuying={isBuying}
          />
        </PinnedBuyBar>
      ) : inFlowFooter ? (
        <FooterBar />
      ) : (
        <div className="fixed bottom-0 left-0 right-0 py-2 text-center bg-background/80 backdrop-blur-sm">
          <Footer />
        </div>
      )}

      <LoginPromptDialog
        open={showLoginPrompt}
        onOpenChange={setShowLoginPrompt}
        onLogin={editMode ? noopAsyncAuth : onLogin}
        onSignUp={editMode ? noopAsyncAuth : onSignUp}
      />
    </main>
  );
}
