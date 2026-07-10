import { useColorScheme } from "react-native";
import { Colors } from "../constants/colors";

export function useColors() {
  const colorScheme = useColorScheme();
  return Colors[colorScheme === "dark" ? "dark" : "light"];
}
