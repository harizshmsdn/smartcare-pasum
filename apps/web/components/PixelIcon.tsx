// apps/web/components/PixelIcon.tsx
"use client";

import React from "react";
import { Icon, IconProps } from "@iconify/react";

export interface PixelIconProps extends Omit<IconProps, "icon"> {
  name?: string;
  className?: string;
  size?: number | string;
  color?: string;
}

// Streamline Pixel icon name mapping for convenience
export const STREAMLINE_PIXEL_MAP = {
  home: "streamline-pixel:interface-essential-home-1",
  dashboard: "streamline-pixel:business-product-report-present-grahp",
  classes: "streamline-pixel:content-files-book",
  alerts: "streamline-pixel:interface-essential-notification-alert",
  profile: "streamline-pixel:user-gender-male",
  users: "streamline-pixel:multiple-user",
  settings: "streamline-pixel:interface-essential-setting-cog",
  sliders: "streamline-pixel:interface-essential-setting-slide",
  logout: "streamline-pixel:interface-essential-signout-logout",
  graduation: "streamline-pixel:school-science-graduation-cap",
  award: "streamline-pixel:interface-essential-trophy",
  calendar: "streamline-pixel:time-clock-calendar-schedule",
  clock: "streamline-pixel:time-clock-alarm-1",
  check: "streamline-pixel:business-product-check",
  close: "streamline-pixel:interface-essential-alert-circle-1",
  search: "streamline-pixel:interface-essential-search-1",
  shield: "streamline-pixel:single-user-shield",
  warning: "streamline-pixel:interface-essential-alert-triangle-1",
  arrowRight: "streamline-pixel:interface-essential-synchronize-arrows-square-1",
  cases: "streamline-pixel:building-real-eastate-project-blueprint",
  schedules: "streamline-pixel:time-clock-calendar-schedule",
  phone: "streamline-pixel:communication-call-phone",
  mail: "streamline-pixel:email-envelope-message",
  pin: "streamline-pixel:building-real-eastate-location",
  building: "streamline-pixel:building-real-eastate-house-1",
  key: "streamline-pixel:security-protection-key",
  eye: "streamline-pixel:interface-essential-eye",
  eyeOff: "streamline-pixel:interface-essential-eye-blind",
  book: "streamline-pixel:content-files-open-book",
  trendingUp: "streamline-pixel:business-product-report-present-grahp",
  chart: "streamline-pixel:interface-essential-pie-chart-poll-report-1",
  edit: "streamline-pixel:interface-essential-pencil-edit-1",
  qrCode: "streamline-pixel:computers-devices-electronics-mobile-qr-scan",
  scan: "streamline-pixel:phone-scan-qr-code-1",
  checkCircle: "streamline-pixel:business-product-check"
};

export type StreamlinePixelKey = keyof typeof STREAMLINE_PIXEL_MAP;

// Component rendering official Streamline Pixel icons
export function PixelIcon({
  name = "home",
  className = "",
  size = 20,
  color,
  style,
  ...props
}: PixelIconProps & { name?: StreamlinePixelKey | string }) {
  const iconId = (STREAMLINE_PIXEL_MAP as any)[name] || (name.startsWith("streamline-pixel:") ? name : `streamline-pixel:${name}`);

  return (
    <Icon
      icon={iconId}
      width={size}
      height={size}
      className={`inline-block shrink-0 pixel-crisp ${className}`}
      style={{
        shapeRendering: "crispEdges",
        color,
        ...style
      }}
      {...props}
    />
  );
}

// Convenience export wrappers
export const PixelHome = (props: PixelIconProps) => <PixelIcon name="home" {...props} />;
export const PixelDashboard = (props: PixelIconProps) => <PixelIcon name="dashboard" {...props} />;
export const PixelClasses = (props: PixelIconProps) => <PixelIcon name="classes" {...props} />;
export const PixelAlerts = (props: PixelIconProps) => <PixelIcon name="alerts" {...props} />;
export const PixelProfile = (props: PixelIconProps) => <PixelIcon name="profile" {...props} />;
export const PixelUsers = (props: PixelIconProps) => <PixelIcon name="users" {...props} />;
export const PixelSettings = (props: PixelIconProps) => <PixelIcon name="settings" {...props} />;
export const PixelLogOut = (props: PixelIconProps) => <PixelIcon name="logout" {...props} />;
export const PixelGraduation = (props: PixelIconProps) => <PixelIcon name="graduation" {...props} />;
export const PixelAward = (props: PixelIconProps) => <PixelIcon name="award" {...props} />;
export const PixelCalendar = (props: PixelIconProps) => <PixelIcon name="calendar" {...props} />;
export const PixelClock = (props: PixelIconProps) => <PixelIcon name="clock" {...props} />;
export const PixelCheck = (props: PixelIconProps) => <PixelIcon name="check" {...props} />;
export const PixelClose = (props: PixelIconProps) => <PixelIcon name="close" {...props} />;
export const PixelSearch = (props: PixelIconProps) => <PixelIcon name="search" {...props} />;
export const PixelShield = (props: PixelIconProps) => <PixelIcon name="shield" {...props} />;
export const PixelWarning = (props: PixelIconProps) => <PixelIcon name="warning" {...props} />;
export const PixelCases = (props: PixelIconProps) => <PixelIcon name="cases" {...props} />;
export const PixelSchedules = (props: PixelIconProps) => <PixelIcon name="schedules" {...props} />;
export const PixelPhone = (props: PixelIconProps) => <PixelIcon name="phone" {...props} />;
export const PixelMail = (props: PixelIconProps) => <PixelIcon name="mail" {...props} />;
export const PixelPin = (props: PixelIconProps) => <PixelIcon name="pin" {...props} />;
export const PixelBuilding = (props: PixelIconProps) => <PixelIcon name="building" {...props} />;
export const PixelKey = (props: PixelIconProps) => <PixelIcon name="key" {...props} />;

export default PixelIcon;
