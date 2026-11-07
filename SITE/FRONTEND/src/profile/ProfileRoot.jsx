import { useState, Suspense, lazy } from "react";
import { AnimatePresence } from "motion/react";
import { Calendar, Link2, MessageSquare, User } from "lucide-react";

import ProfileActivityTracker from "./components/analytics/ProfileActivityTracker.jsx";
import AppFooter from "./components/layout/AppFooter.jsx";
import ContentCard from "./components/layout/ContentCard.jsx";
import DesktopTabs from "./components/navigation/DesktopTabs.jsx";
import MobileNavigation from "./components/navigation/MobileNavigation.jsx";
import TabPanel from "./components/navigation/TabPanel.jsx";
import ContactSection from "./components/contact/ContactSection.jsx";
import ProfileHeader from "./components/profile/ProfileHeader.jsx";
import LoadingScreen from "./components/common/LoadingScreen.jsx";
import NotFoundPage from "../pages/NotFoundPage.jsx";
import { useLanguage } from "./lib/LanguageContext.jsx";
import { usePortfolio } from "./lib/PortfolioContext.jsx";
import { ProfileThemeProvider } from "./lib/ProfileThemeContext.jsx";

const SocialLinks = lazy(() => import("./components/social/SocialLinks.jsx"));
const HireRequestForm = lazy(() => import("./components/hire/HireRequestForm.jsx"));
const BookingSection = lazy(() => import("./components/booking/BookingSection.jsx"));
const SettingsDrawer = lazy(() => import("./components/settings/SettingsDrawer.jsx"));

export default function App() {
  const [activeTab, setActiveTab] = useState("about");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { t } = useLanguage();
  const { profile, isLoading, isError, isNotFound } = usePortfolio();

  const allTabs = [
    { id: "about", label: t.aboutTab, icon: User },
    { id: "links", label: t.linksTab, icon: Link2 },
    { id: "hire", label: t.hireTab, icon: MessageSquare },
    { id: "booking", label: t.bookingTab || "Book", icon: Calendar },
  ];

  // actionType === "form"     → show hire, hide booking
  // actionType === "calendar" → show booking, hide hire
  // anything else             → show both
  const tabs = allTabs.filter((tab) => {
    if (profile?.actionType === "form" && tab.id === "booking") return false;
    if (profile?.actionType === "calendar" && tab.id === "hire") return false;
    return true;
  });

  return (
    <ProfileThemeProvider>
      <div id="profile-themed-root" className="min-h-screen bg-slate-50/50 dark:bg-[#080c14] pb-24 lg:pb-12 text-slate-900 dark:text-slate-100 transition-colors duration-300">
        <ProfileActivityTracker />
        <Suspense fallback={null}>
          <SettingsDrawer isOpen={isSettingsOpen} setIsOpen={setIsSettingsOpen} />
        </Suspense>

        {isLoading ? (
          <div className="flex min-h-screen items-center justify-center">
            <LoadingScreen />
          </div>
        ) : isNotFound ? (
          <div className="flex min-h-screen items-center justify-center">
            <NotFoundPage code="profileNotFound" />
          </div>
        ) : (
          <>
            <main className="max-w-5xl mx-auto px-4 lg:px-4 pt-4 lg:pt-8">
              {isError && (
                <div className="mx-4 lg:mx-0 mb-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 px-4 py-3 text-xs font-medium text-slate-600 dark:text-slate-300">
                  {t.profileLoadError}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start relative">
                <ContentCard className="col-span-1 lg:col-span-5 p-4 sm:p-6 lg:sticky lg:top-24 lg:self-start z-20">
                  <ProfileHeader />
                </ContentCard>

                <section className="col-span-1 lg:col-span-7 flex flex-col gap-4 lg:gap-6">
                  <DesktopTabs
                    tabs={tabs}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                  />

                  <ContentCard className="p-4 sm:p-6 min-h-[500px] lg:min-h-[580px] flex flex-col justify-start overflow-visible relative">
                    <AnimatePresence mode="wait">
                      {activeTab === "about" && (
                        <TabPanel key="about">
                          <ContactSection />
                        </TabPanel>
                      )}

                      {activeTab === "links" && (
                        <TabPanel key="links">
                          <Suspense fallback={<div className="p-8 flex justify-center"><span className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" /></div>}>
                            <SocialLinks />
                          </Suspense>
                        </TabPanel>
                      )}

                      {activeTab === "hire" && (
                        <TabPanel key="hire">
                          <Suspense fallback={<div className="p-8 flex justify-center"><span className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" /></div>}>
                            <HireRequestForm />
                          </Suspense>
                        </TabPanel>
                      )}

                      {activeTab === "booking" && (
                        <TabPanel key="booking">
                          <Suspense fallback={<div className="p-8 flex justify-center"><span className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" /></div>}>
                            <BookingSection />
                          </Suspense>
                        </TabPanel>
                      )}
                    </AnimatePresence>
                  </ContentCard>
                </section>
              </div>
            </main>

            <AppFooter />

            <MobileNavigation
              tabs={tabs}
              activeTab={activeTab}
              isSettingsOpen={isSettingsOpen}
              settingsLabel={t.settingsTab}
              onTabChange={setActiveTab}
              onSettingsOpen={() => setIsSettingsOpen(true)}
            />
          </>
        )}
      </div>
    </ProfileThemeProvider>
  );
}
