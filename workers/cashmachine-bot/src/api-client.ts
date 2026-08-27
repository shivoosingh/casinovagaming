/**
 * Worker-side CashMachine API Client wrapper
 */
import { CashMachineApiClient, getCashMachineApiClient } from "../../../src/lib/game-automation/cashmachine-api.js";

export { CashMachineApiClient, getCashMachineApiClient };
export type {
  CashMachineLoginResponse,
  CashMachinePlayer,
  CashMachinePlayerListResponse,
  CashMachineAddPlayerResponse,
  CashMachineGetScoreResponse,
  CashMachineRechargeResponse,
  CashMachineWithdrawResponse,
  CashMachineApiConfig,
} from "../../../src/lib/game-automation/cashmachine-api.js";
