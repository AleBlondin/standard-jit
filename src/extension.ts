// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import {
  ExtensionContext,
  languages,
  commands,
  Disposable,
  workspace,
  window,
  env,
  Uri,
  QuickPickItem,
} from "vscode";
import { CodelensProvider } from "./CodelensProvider";
import { hideStandard, standardUrisToHideKey } from "./standardsToHide";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

let disposables: Disposable[] = [];

type QuickPickItemType = "link" | "hide";
interface RedirectionQuickPickItem extends QuickPickItem {
  url: string;
  type: QuickPickItemType;
}

const formatLinkLabel = (matchedText: string, url: string) => {
  try {
    return `${matchedText} -> ${url
      .split("/m33/")[1]
      .split("-")
      .slice(undefined, -1)
      .join("-")}`;
  } catch (e) {
    return url;
  }
};

export function activate(context: ExtensionContext) {
  // This cleans the state, uncomment it for debugging purposes
  // context.globalState.update("standardUrisToHide", undefined);

  const codelensProvider = new CodelensProvider(context.globalState);

  languages.registerCodeLensProvider("*", codelensProvider);

  commands.registerCommand("standard-jit.enableCodeLens", () => {
    workspace
      .getConfiguration("standard-jit")
      .update("enableCodeLens", true, true);
  });

  commands.registerCommand("standard-jit.disableCodeLens", () => {
    workspace
      .getConfiguration("standard-jit")
      .update("enableCodeLens", false, true);
  });

  commands.registerCommand(
    "standard-jit.hideStandard",
    (standardUri: string) => {
      hideStandard(context.globalState)(standardUri);
    }
  );

  commands.registerCommand(
    "standard-jit.codelensAction",
    (matchedText: string, urls: string[]) => {
      const quickPick = window.createQuickPick<RedirectionQuickPickItem>();
      quickPick.canSelectMany = false;

      const urlsToHide =
        context.globalState.get<string[]>(standardUrisToHideKey) || [];
      const urlsToDisplay = urls.filter((url) => !urlsToHide.includes(url));

      const linkQuickPickItems = urlsToDisplay.map((url: string) => ({
        label: formatLinkLabel(matchedText, url),
        url: url,
        type: "link" as QuickPickItemType,
      }));
      const hideQuickPickItems = urlsToDisplay.map((url) => ({
        label: `Hide this standard: ${formatLinkLabel(matchedText, url)}`,
        url: url,
        type: "hide" as QuickPickItemType,
      }));

      quickPick.items = [...linkQuickPickItems, ...hideQuickPickItems];

      quickPick.onDidChangeSelection((selection) => {
        const { type, url } = selection[0];
        console.log({ type, url });
        if (type === "link") {
          env.openExternal(Uri.parse(url));
        }
        if (type === "hide") {
          commands.executeCommand("standard-jit.hideStandard", url);
          quickPick.dispose();
        }
      });

      quickPick.show();
    }
  );
}

// this method is called when your extension is deactivated
export function deactivate() {
  if (disposables) {
    disposables.forEach((item) => item.dispose());
  }
  disposables = [];
}
