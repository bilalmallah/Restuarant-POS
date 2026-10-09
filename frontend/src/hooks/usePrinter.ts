import { useCallback } from "react";

import { useGetSettingsQuery, useSendToPrinterMutation } from "../features/posApi";
import { usePrintDocument } from "./usePrint";
import { errorMessage } from "../utils/api";
import { receiptToText, tokenToText, shoppingListToText } from "../utils/receiptText";
import { useToast } from "../components/ui/Toast";
import type { KitchenToken, Order, ShoppingList } from "../types";

/**
 * One place that decides HOW something prints.
 *
 * Silent mode on  - the text goes to the API, which hands it to a named Windows
 *                   printer. No dialog, no popup blocker, and a real error on
 *                   screen when the printer is off or missing.
 * Silent mode off - the browser prints the styled HTML as before, dialog and all.
 *
 * Screens call printReceipt/printToken and stay out of it.
 */
export const usePrinter = () => {
  const toast = useToast();
  const { data: settingsResponse } = useGetSettingsQuery();
  const [sendToPrinter, { isLoading: sending }] = useSendToPrinterMutation();

  const settings = settingsResponse?.settings;
  const silent = settings?.silentPrint === "true";

  const receiptDoc = usePrintDocument<{ order: Order; isReprint: boolean }>();
  const tokenDoc = usePrintDocument<KitchenToken>();
  const listDoc = usePrintDocument<ShoppingList>();

  const send = useCallback(
    async (target: "receipt" | "kitchen", text: string, label: string) => {
      try {
        const result = await sendToPrinter({ target, text, label }).unwrap();
        toast.success(result.message);
        return true;
      } catch (caught) {
        // The API distinguishes "no printer chosen", "not installed" and
        // "offline", so pass its wording straight through.
        toast.error(errorMessage(caught, "The printer did not accept the job"));
        return false;
      }
    },
    [sendToPrinter, toast]
  );

  const printReceipt = useCallback(
    async (order: Order, isReprint = false) => {
      if (silent) {
        await send("receipt", receiptToText(order, settings, { isReprint }), "Bill");
        return;
      }

      receiptDoc.print({ order, isReprint });
    },
    [silent, send, settings, receiptDoc]
  );

  const printToken = useCallback(
    async (token: KitchenToken) => {
      if (silent) {
        await send("kitchen", tokenToText(token, settings), "Kitchen token");
        return;
      }

      tokenDoc.print(token);
    },
    [silent, send, settings, tokenDoc]
  );

  const printShoppingList = useCallback(
    async (list: ShoppingList) => {
      if (silent) {
        await send("kitchen", shoppingListToText(list, settings), "Purchase list");
        return;
      }

      listDoc.print(list);
    },
    [silent, send, settings, listDoc]
  );

  return {
    silent,
    sending,
    settings,
    printReceipt,
    printToken,
    printShoppingList,
    /** The mounted documents, for the caller to render inside a PrintPortal. */
    receiptDocument: receiptDoc.document,
    tokenDocument: tokenDoc.document,
    listDocument: listDoc.document,
  };
};

export default usePrinter;
