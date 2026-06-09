/**
 * @file IconMap.tsx
 * @description Emoji → Lucide icon mapper + IconBadge wrapper for Prosper Pro.
 * Replaces all emoji usage with professional SVG icons.
 */

import React from 'react';
import type { LucideProps } from 'lucide-react';
import {
  Target, CreditCard, Banknote, CalendarDays, Globe, Globe2, Moon, Sun,
  Sparkles, GraduationCap, Video, Activity, Sunset, Home, Building2,
  Landmark, School, Tag, Bug, Eye, Hand, User, Pill, Diamond, Heart,
  Gem, Lightbulb, MessageSquare, Wallet, ArrowLeftRight, DollarSign,
  Laptop, Briefcase, Save, Folder, TrendingUp, BarChart3, ClipboardList,
  Pin, BookOpen, Library, ScrollText, Phone, Send, Download, Mail,
  MailOpen, Smartphone, Camera, Tv, RefreshCw, Lock, Bell, Wrench,
  Hexagon, Trash2, EyeOff, Rocket, Car, Ban, ShoppingCart, Shield,
  Circle, Bot, Handshake, Receipt, Plane, Pencil, CheckCircle2, XCircle,
  HelpCircle, Scale, Settings, AlertTriangle, Zap, LayoutGrid, type LucideIcon,
} from 'lucide-react';

/** Props for the IconBadge wrapper */
export interface IconBadgeProps {
  icon: LucideIcon | string;
  size?: number;
  color?: string;
  bg?: string;
  className?: string;
  style?: React.CSSProperties;
}

/** Map emoji string → Lucide icon component */
export const EMOJI_TO_ICON: Record<string, LucideIcon> = {
  '🎯': Target,
  '💳': CreditCard,
  '💸': Banknote,
  '📅': CalendarDays,
  '🌍': Globe,
  '🌐': Globe2,
  '🌙': Moon,
  '🌞': Sun,
  '☀': Sun,
  '🍔': LayoutGrid,
  '🎉': Sparkles,
  '🎓': GraduationCap,
  '🎬': Video,
  '🏃': Activity,
  '🏖': Sunset,
  '🏠': Home,
  '🏢': Building2,
  '🏦': Landmark,
  '🏫': School,
  '🏷': Tag,
  '🐛': Bug,
  '👁': Eye,
  '👋': Hand,
  '👤': User,
  '👨': User,
  '👩': User,
  '💊': Pill,
  '💎': Diamond,
  '💚': Heart,
  '💠': Gem,
  '💡': Lightbulb,
  '💬': MessageSquare,
  '💰': Wallet,
  '💱': ArrowLeftRight,
  '💲': DollarSign,
  '💵': Banknote,
  '💻': Laptop,
  '💼': Briefcase,
  '💾': Save,
  '📁': Folder,
  '📈': TrendingUp,
  '📊': BarChart3,
  '📋': ClipboardList,
  '📌': Pin,
  '📖': BookOpen,
  '📚': Library,
  '📜': ScrollText,
  '📞': Phone,
  '📤': Send,
  '📥': Download,
  '📧': Mail,
  '📬': MailOpen,
  '📱': Smartphone,
  '📷': Camera,
  '📸': Camera,
  '📺': Tv,
  '🔄': RefreshCw,
  '🔒': Lock,
  '🔔': Bell,
  '🔧': Wrench,
  '🔷': Hexagon,
  '🗑': Trash2,
  '🙈': EyeOff,
  '🚀': Rocket,
  '🚗': Car,
  '🚫': Ban,
  '🛒': ShoppingCart,
  '🛡': Shield,
  '🟠': Circle,
  '🤖': Bot,
  '🤝': Handshake,
  '🧾': Receipt,
  '✈': Plane,
  '✉': Mail,
  '✏': Pencil,
  '✅': CheckCircle2,
  '✨': Sparkles,
  '❌': XCircle,
  '❓': HelpCircle,
  '⚖': Scale,
  '⚙': Settings,
  '⚠': AlertTriangle,
  '⚡': Zap,
  '⚫': Circle,
};

/** Named icon key → Lucide icon component (for JSON configs) */
export const NAMED_ICONS: Record<string, LucideIcon> = {
  Target, CreditCard, Banknote, CalendarDays, Globe, Globe2, Moon, Sun,
  Sparkles, GraduationCap, Video, Activity, Sunset, Home, Building2,
  Landmark, School, Tag, Bug, Eye, Hand, User, Pill, Diamond, Heart,
  Gem, Lightbulb, MessageSquare, Wallet, ArrowLeftRight, DollarSign,
  Laptop, Briefcase, Save, Folder, TrendingUp, BarChart3, ClipboardList,
  Pin, BookOpen, Library, ScrollText, Phone, Send, Download, Mail,
  MailOpen, Smartphone, Camera, Tv, RefreshCw, Lock, Bell, Wrench,
  Hexagon, Trash2, EyeOff, Rocket, Car, Ban, ShoppingCart, Shield,
  Circle, Bot, Handshake, Receipt, Plane, Pencil, CheckCircle2, XCircle,
  HelpCircle, Scale, Settings, AlertTriangle, Zap, LayoutGrid,
};

/** Resolve an emoji or icon name to a Lucide component. Falls back to Circle. */
export function getLucideIcon(key: string): LucideIcon {
  if (NAMED_ICONS[key]) return NAMED_ICONS[key];
  if (EMOJI_TO_ICON[key]) return EMOJI_TO_ICON[key];
  return Circle;
}

/** Predefined color palette for icon badges (matches the Quick Actions screenshot style) */
export const ICON_BADGE_COLORS: Record<string, { bg: string; color: string }> = {
  Target:         { bg: '#E85D4C', color: '#fff' },
  CreditCard:     { bg: '#F5B800', color: '#1a1a2e' },
  Banknote:       { bg: '#3DCC8E', color: '#fff' },
  CalendarDays:   { bg: '#E85D4C', color: '#fff' },
  Globe:          { bg: '#3B82F6', color: '#fff' },
  Globe2:         { bg: '#3B82F6', color: '#fff' },
  Moon:           { bg: '#6366F1', color: '#fff' },
  Sun:            { bg: '#F5B800', color: '#1a1a2e' },
  Sparkles:       { bg: '#A855F7', color: '#fff' },
  GraduationCap:  { bg: '#3B82F6', color: '#fff' },
  Video:          { bg: '#E85D4C', color: '#fff' },
  Activity:       { bg: '#3DCC8E', color: '#fff' },
  Sunset:         { bg: '#F97316', color: '#fff' },
  Home:           { bg: '#3B82F6', color: '#fff' },
  Building2:      { bg: '#6366F1', color: '#fff' },
  Landmark:       { bg: '#F5B800', color: '#1a1a2e' },
  School:         { bg: '#3B82F6', color: '#fff' },
  Tag:            { bg: '#EC4899', color: '#fff' },
  Bug:            { bg: '#E85D4C', color: '#fff' },
  Eye:            { bg: '#3B82F6', color: '#fff' },
  Hand:           { bg: '#F97316', color: '#fff' },
  User:           { bg: '#6366F1', color: '#fff' },
  Pill:           { bg: '#EC4899', color: '#fff' },
  Diamond:        { bg: '#3B82F6', color: '#fff' },
  Heart:          { bg: '#E85D4C', color: '#fff' },
  Gem:            { bg: '#A855F7', color: '#fff' },
  Lightbulb:      { bg: '#F5B800', color: '#1a1a2e' },
  MessageSquare:  { bg: '#3B82F6', color: '#fff' },
  Wallet:         { bg: '#3DCC8E', color: '#fff' },
  ArrowLeftRight: { bg: '#6366F1', color: '#fff' },
  DollarSign:     { bg: '#3DCC8E', color: '#fff' },
  Laptop:         { bg: '#6366F1', color: '#fff' },
  Briefcase:      { bg: '#8B5CF6', color: '#fff' },
  Save:           { bg: '#3B82F6', color: '#fff' },
  Folder:         { bg: '#F5B800', color: '#1a1a2e' },
  TrendingUp:     { bg: '#3DCC8E', color: '#fff' },
  BarChart3:      { bg: '#3B82F6', color: '#fff' },
  ClipboardList:  { bg: '#F97316', color: '#fff' },
  Pin:            { bg: '#E85D4C', color: '#fff' },
  BookOpen:       { bg: '#3B82F6', color: '#fff' },
  Library:        { bg: '#8B5CF6', color: '#fff' },
  ScrollText:     { bg: '#F5B800', color: '#1a1a2e' },
  Phone:          { bg: '#3DCC8E', color: '#fff' },
  Send:           { bg: '#3B82F6', color: '#fff' },
  Download:       { bg: '#3DCC8E', color: '#fff' },
  Mail:           { bg: '#E85D4C', color: '#fff' },
  MailOpen:       { bg: '#E85D4C', color: '#fff' },
  Smartphone:     { bg: '#6366F1', color: '#fff' },
  Camera:         { bg: '#8B5CF6', color: '#fff' },
  Tv:             { bg: '#6366F1', color: '#fff' },
  RefreshCw:      { bg: '#3B82F6', color: '#fff' },
  Lock:           { bg: '#F5B800', color: '#1a1a2e' },
  Bell:           { bg: '#F5B800', color: '#1a1a2e' },
  Wrench:         { bg: '#6B7280', color: '#fff' },
  Hexagon:        { bg: '#3B82F6', color: '#fff' },
  Trash2:         { bg: '#6B7280', color: '#fff' },
  EyeOff:         { bg: '#6B7280', color: '#fff' },
  Rocket:         { bg: '#E85D4C', color: '#fff' },
  Car:            { bg: '#3B82F6', color: '#fff' },
  Ban:            { bg: '#6B7280', color: '#fff' },
  ShoppingCart:   { bg: '#F97316', color: '#fff' },
  Shield:         { bg: '#3DCC8E', color: '#fff' },
  Circle:         { bg: '#6B7280', color: '#fff' },
  Bot:            { bg: '#6366F1', color: '#fff' },
  Handshake:      { bg: '#3DCC8E', color: '#fff' },
  Receipt:        { bg: '#F5B800', color: '#1a1a2e' },
  Plane:          { bg: '#3B82F6', color: '#fff' },
  Pencil:         { bg: '#F5B800', color: '#1a1a2e' },
  CheckCircle2:   { bg: '#3DCC8E', color: '#fff' },
  XCircle:        { bg: '#E85D4C', color: '#fff' },
  HelpCircle:     { bg: '#3B82F6', color: '#fff' },
  Scale:          { bg: '#F5B800', color: '#1a1a2e' },
  Settings:       { bg: '#6B7280', color: '#fff' },
  AlertTriangle:  { bg: '#F5B800', color: '#1a1a2e' },
  Zap:            { bg: '#3DCC8E', color: '#fff' },
  LayoutGrid:     { bg: '#6366F1', color: '#fff' },
};

/** Render a Lucide icon inside a colored circular badge */
export function IconBadge({
  icon,
  size = 20,
  color,
  bg,
  className = '',
  style,
}: IconBadgeProps) {
  const IconComp = typeof icon === 'string' ? getLucideIcon(icon) : icon;
  const iconName = IconComp.name || (typeof icon === 'string' ? icon : '');
  const palette = ICON_BADGE_COLORS[iconName] || { bg: '#3DCC8E', color: '#fff' };

  return (
    <span
      className={`icon-badge ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size * 1.8,
        height: size * 1.8,
        borderRadius: '50%',
        background: bg ?? palette.bg,
        color: color ?? palette.color,
        flexShrink: 0,
        ...style,
      }}
    >
      <IconComp size={size} strokeWidth={2.2} />
    </span>
  );
}

/** Render a Lucide icon directly (no badge). Useful for inline replacements. */
export function InlineIcon({
  icon,
  size = 18,
  className = '',
  style,
}: {
  icon: LucideIcon | string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const IconComp = typeof icon === 'string' ? getLucideIcon(icon) : icon;
  return <IconComp size={size} className={className} style={style} />;
}
