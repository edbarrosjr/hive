import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { useMobileTokens } from "../lib/native";
import { NativeSymbol } from "./native-symbol";

/**
 * Conversation header: a round menu button, the bot centered with its name and
 * live status underneath, and one action pill on the right. Replaces the native
 * navigation bar on thread screens.
 */
export function ThreadHeader({
  avatar,
  name,
  status,
  topInset,
  menuLabel,
  onMenu,
  openLabel,
  onOpen,
  actionLabel,
  onAction,
}: {
  avatar: ReactNode;
  name: string;
  status: string | null;
  topInset: number;
  menuLabel: string;
  onMenu: () => void;
  openLabel: string;
  onOpen?: () => void;
  actionLabel: string;
  onAction: () => void;
}) {
  const tokens = useMobileTokens();
  return (
    <View style={{ paddingTop: topInset + 6, alignItems: "center" }}>
      <View
        style={{
          width: "100%",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={menuLabel}
          hitSlop={8}
          onPress={onMenu}
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: tokens.secondary,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <NativeSymbol
            ios="line.3.horizontal"
            android="menu"
            size={22}
            color={tokens.foreground}
          />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          onPress={onAction}
          style={{
            height: 44,
            paddingHorizontal: 18,
            borderRadius: 22,
            backgroundColor: tokens.secondary,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: tokens.foreground, fontSize: 17, fontWeight: "600" }}>
            {actionLabel}
          </Text>
        </Pressable>
      </View>
      <Pressable
        accessibilityRole={onOpen ? "button" : "header"}
        accessibilityLabel={openLabel}
        disabled={!onOpen}
        onPress={onOpen}
        style={{ alignItems: "center", marginTop: -26 }}
      >
        <View
          style={{
            padding: 3,
            borderRadius: 48,
            backgroundColor: tokens.background,
          }}
        >
          {avatar}
        </View>
        <Text
          numberOfLines={1}
          style={{ color: tokens.foreground, fontSize: 19, fontWeight: "600", marginTop: 6 }}
        >
          {name}
        </Text>
        {status ? (
          <View
            style={{
              marginTop: 6,
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: tokens.secondary,
            }}
          >
            <Text style={{ color: tokens.mutedForeground, fontSize: 15 }}>{status}</Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}
