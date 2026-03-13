import { map } from "nanostores";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { auth } from "../lib/firebase";

export type AuthState = {
  user: User | null;
  loading: boolean;
  error: string | null;
  calendarAccessToken: string | null;
};

export const $authStore = map<AuthState>({
  user: null,
  loading: true,
  error: null,
  calendarAccessToken: null,
});

// Setup Google Provider with Calendar scopes for events
const provider = new GoogleAuthProvider();
provider.addScope("https://www.googleapis.com/auth/calendar.readonly");
provider.addScope("https://www.googleapis.com/auth/calendar.events.readonly");

export const loginWithGoogle = async () => {
  $authStore.setKey("loading", true);
  $authStore.setKey("error", null);
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      $authStore.setKey("calendarAccessToken", credential.accessToken);
    }
    $authStore.setKey("user", result.user);
  } catch (error: any) {
    console.error("Login failed", error);
    $authStore.setKey("error", error.message || "Failed to login with Google");
  } finally {
    $authStore.setKey("loading", false);
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
    $authStore.set({
      user: null,
      loading: false,
      error: null,
      calendarAccessToken: null,
    });
  } catch (error: any) {
    console.error("Logout failed", error);
  }
};

// Listen to auth state changes
if (typeof window !== "undefined") {
  onAuthStateChanged(auth, (user) => {
    $authStore.setKey("user", user);
    $authStore.setKey("loading", false);
  });
}
