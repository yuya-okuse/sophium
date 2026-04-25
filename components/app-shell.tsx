"use client"

import { Chats, House } from "@phosphor-icons/react"
import { useLocale, useTranslations } from "next-intl"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Link, usePathname } from "@/i18n/navigation"

type AppShellProps = {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const t = useTranslations("Nav")
  const tChat = useTranslations("Chat")
  const pathname = usePathname()
  const locale = useLocale()

  const isHome = pathname === "/"
  const isChat = pathname === "/chat" || pathname.startsWith("/chat/")

  return (
    <TooltipProvider>
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader className="flex flex-row items-center gap-2 border-b border-sidebar-border p-2">
            <SidebarTrigger
              className="md:opacity-100"
            />
            <span className="truncate text-sm font-semibold text-sidebar-foreground">
              {t("appName")}
            </span>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>{t("sectionNav")}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={isHome}
                      render={<Link href="/" />}
                      tooltip={t("home")}
                    >
                      <House weight="duotone" />
                      <span>{t("home")}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={isChat}
                      render={<Link href="/chat" />}
                      tooltip={t("chat")}
                    >
                      <Chats weight="duotone" />
                      <span>{t("chat")}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="border-t border-sidebar-border">
            <div className="flex flex-col gap-1.5 px-2 py-1 text-xs text-sidebar-foreground/80">
              <p className="px-1 font-medium text-sidebar-foreground">
                {t("language")}
              </p>
              <div className="flex flex-wrap items-center gap-1.5 px-1">
                {locale === "ja" ? (
                  <Link
                    href={pathname}
                    locale="en"
                    className="text-sidebar-foreground underline-offset-2 hover:underline"
                  >
                    {tChat("switchToEn")}
                  </Link>
                ) : (
                  <Link
                    href={pathname}
                    locale="ja"
                    className="text-sidebar-foreground underline-offset-2 hover:underline"
                  >
                    {tChat("switchToJa")}
                  </Link>
                )}
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset className="min-h-0 min-w-0">
          {children}
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
