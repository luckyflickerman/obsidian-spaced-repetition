import { ButtonComponent, setIcon, Setting, SettingGroup } from "obsidian";

import { isAddonPage } from "src/addons/addons";
import { ad } from "src/addons/addons-i18n";
import { refreshDailyGoalViews } from "src/card-authoring/daily-goal-view";
import { PLUGIN_REPO_URL } from "src/data/constants";
import { DataManager } from "src/data/data-manager";
import { DebugLoggerInstance } from "src/data/debug-logger";
import { SettingsManager } from "src/data/settings-manager";
import { t, tHTML } from "src/lang/helpers";
import { LocaleManagerInstance } from "src/lang/locale-manager";
import SRPlugin from "src/main";
import { setDebugParser } from "src/parser";
import {
    addPageLinkSetting,
    createBuiltInPluginsGroup,
} from "src/ui/obsidian-ui-components/built-in-plugins-group";
import { SettingsPage } from "src/ui/obsidian-ui-components/content-container/settings-page/settings-page";
import {
    getPageIcon,
    getPageName,
    SettingsPageType,
    SettingsPageTypesArray,
} from "src/ui/obsidian-ui-components/content-container/settings-page/settings-page-types";

/**
 * Represents the main settings page, from which all other settings pages are accessed.
 *
 * @class MainPage
 * @extends {SettingsPage}
 */
export class MainPage extends SettingsPage {
    private refreshBuiltInPlugins: () => void = () => {};

    constructor(
        pageContainerEl: HTMLElement,
        plugin: SRPlugin,
        settingsManager: SettingsManager,
        dataManager: DataManager,
        pageType: SettingsPageType,
        display: () => void,
        openPage: (pageType: SettingsPageType) => void,
        scrollListener: (scrollPosition: number) => void,
    ) {
        super(
            pageContainerEl,
            plugin,
            settingsManager,
            dataManager,
            pageType,
            () => {},
            display,
            openPage,
            scrollListener,
        );

        this.containerEl.addClass("sr-main-page");

        // "Options" (every page except the built-in plugins), then "Built-in plugins"
        // with their switches, like Obsidian's own settings
        const mainSettingsGroup = new SettingGroup(this.containerEl).setHeading(ad("OPTIONS"));
        SettingsPageTypesArray.forEach((pageType) => {
            if (pageType === "main-page") return;
            if (pageType === "statistics-page") return;
            if (isAddonPage(pageType)) return;
            addPageLinkSetting(mainSettingsGroup, pageType, (p) => this.openPage(p));
        });

        mainSettingsGroup.addSetting((setting: Setting) => {
            setting
                .setName(t("LANGUAGE_SETTINGS"))
                .setDesc(t("LANGUAGE_SETTINGS_DESC"))
                .addDropdown((dropdown) => {
                    dropdown.addOption("-", t("DEFAULT_LOCALE_NAME"));

                    LocaleManagerInstance.getInstance()
                        .getLocaleOptionsList()
                        .forEach((option) => {
                            dropdown.addOption(option.language, option.languageName);
                        });

                    dropdown.setValue(this.settingsManager.settings.preferredLocale);

                    dropdown.onChange(async (value) => {
                        if (value === "-") {
                            const loadedLocale: string =
                                LocaleManagerInstance.getInstance().loadedLocale;
                            LocaleManagerInstance.getInstance().currentLocale = loadedLocale;
                        } else {
                            LocaleManagerInstance.getInstance().currentLocale = value;
                        }
                        this.settingsManager.settings.preferredLocale = value;
                        await this.plugin.dataManager.savePluginData();
                        this.display();
                    });
                });
        });

        this.refreshBuiltInPlugins = createBuiltInPluginsGroup(
            this.containerEl,
            this.plugin,
            (p) => this.openPage(p),
            () => refreshDailyGoalViews(),
        );

        new SettingGroup(this.containerEl)
            .setHeading(t("INFO"))
            .addSetting((setting: Setting) => {
                setting
                    .setName(getPageName("statistics-page"))
                    .addButton((button: ButtonComponent) => {
                        button.setIcon("chevron-right").onClick(() => {
                            this.openPage("statistics-page");
                        });

                        button.buttonEl.addClass("clickable-icon");
                    });
                const iconEl = activeDocument.createElement("div");
                iconEl.addClass("sr-settings-page-title-icon");
                setIcon(iconEl, getPageIcon("statistics-page"));

                setting.nameEl.insertBefore(iconEl, setting.nameEl.firstChild);
                setting.nameEl.addClass("sr-settings-page-title");
                setting.settingEl.addClass("sr-settings-page-title-setting");
                setting.settingEl.addEventListener("click", () => {
                    this.openPage("statistics-page");
                });
            })
            .addSetting((setting: Setting) => {
                const elements: (HTMLElement | Text)[] = tHTML("CHECK_WIKI", {
                    wikiUrl: "https://stephenmwangi.com/obsidian-spaced-repetition/",
                });

                setting.infoEl.empty();

                for (let i = 0; i < elements.length; i++) {
                    setting.infoEl.append(elements[i]);
                }
            })
            .addSetting((setting: Setting) => {
                const elements: (HTMLElement | Text)[] = tHTML("CHECK_ROADMAP", {
                    roadMapUrl: "https://github.com/users/st3v3nmw/projects/6",
                });

                setting.infoEl.empty();

                for (let i = 0; i < elements.length; i++) {
                    setting.infoEl.append(elements[i]);
                }
            })
            .addSetting((setting: Setting) => {
                const elements: (HTMLElement | Text)[] = tHTML("CHECK_DEV_NEWS", {
                    devNewsUrl:
                        "https://github.com/st3v3nmw/obsidian-spaced-repetition/discussions/categories/development-news",
                });

                setting.infoEl.empty();

                for (let i = 0; i < elements.length; i++) {
                    setting.infoEl.append(elements[i]);
                }
            });

        new SettingGroup(this.containerEl)
            .setHeading(t("HELP") + " & " + t("GROUP_CONTRIBUTING"))
            .addSetting((setting: Setting) => {
                const elements: (HTMLElement | Text)[] = tHTML("GITHUB_DISCUSSIONS", {
                    // Discussions may be disabled in the fork, so questions go to issues too
                    discussionsUrl: `${PLUGIN_REPO_URL}/issues/`,
                });

                setting.infoEl.empty();

                for (let i = 0; i < elements.length; i++) {
                    setting.infoEl.append(elements[i]);
                }
            })
            .addSetting((setting: Setting) => {
                const elements: (HTMLElement | Text)[] = tHTML("GITHUB_ISSUES", {
                    issuesUrl: `${PLUGIN_REPO_URL}/issues/`,
                });

                setting.infoEl.empty();

                for (let i = 0; i < elements.length; i++) {
                    setting.infoEl.append(elements[i]);
                }
            })
            .addSetting((setting: Setting) => {
                const elements: (HTMLElement | Text)[] = tHTML("GITHUB_SOURCE_CODE", {
                    githubProjectUrl: PLUGIN_REPO_URL,
                });

                setting.infoEl.empty();

                for (let i = 0; i < elements.length; i++) {
                    setting.infoEl.append(elements[i]);
                }
            })
            .addSetting((setting: Setting) => {
                const elements: (HTMLElement | Text)[] = tHTML("CODE_CONTRIBUTION_INFO", {
                    codeContributionUrl:
                        "https://stephenmwangi.com/obsidian-spaced-repetition/contributing/#code",
                });

                setting.infoEl.empty();

                for (let i = 0; i < elements.length; i++) {
                    setting.infoEl.append(elements[i]);
                }
            })
            .addSetting((setting: Setting) => {
                const elements: (HTMLElement | Text)[] = tHTML("TRANSLATION_CONTRIBUTION_INFO", {
                    translationContributionUrl:
                        "https://stephenmwangi.com/obsidian-spaced-repetition/contributing/#translating",
                });

                setting.infoEl.empty();

                for (let i = 0; i < elements.length; i++) {
                    setting.infoEl.append(elements[i]);
                }
            });

        new SettingGroup(this.containerEl)
            .setHeading(t("LOGGING"))
            .addSetting((setting: Setting) => {
                setting.setName(t("DISPLAY_SCHEDULING_DEBUG_INFO")).addToggle((toggle) =>
                    toggle
                        .setValue(this.settingsManager.settings.showSchedulingDebugMessages)
                        .onChange(async (value) => {
                            this.settingsManager.settings.showSchedulingDebugMessages = value;
                            await this.settingsManager.save();
                        }),
                );
            })
            .addSetting((setting: Setting) => {
                setting.setName(t("DISPLAY_PARSER_DEBUG_INFO")).addToggle((toggle) =>
                    toggle
                        .setValue(this.settingsManager.settings.showParserDebugMessages)
                        .onChange(async (value) => {
                            this.settingsManager.settings.showParserDebugMessages = value;
                            setDebugParser(this.settingsManager.settings.showParserDebugMessages);
                            await this.settingsManager.save();
                        }),
                );
            })
            .addSetting((setting: Setting) => {
                setting
                    .setName(t("DEBUG_LOG"))
                    .addTextArea((text) =>
                        text.setValue(DebugLoggerInstance.getInstance().getLog("info")),
                    )
                    .addExtraButton((button) => {
                        button
                            .setIcon("copy")
                            .setTooltip(t("COPY"))
                            .onClick(async () => {
                                await navigator.clipboard.writeText(
                                    DebugLoggerInstance.getInstance().getLog("info"),
                                );
                            });
                    });
            });
    }

    /** Back from a plugin's page: it may have been switched there. */
    public render(): void {
        this.refreshBuiltInPlugins();
    }
}
