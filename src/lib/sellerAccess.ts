import { supabase } from "@/lib/supabase";

type SellerProfile = {
  account_type?: string | null;
  seller_status?: string | null;
  storage_quota_bytes?: number | null;
};

export async function ensureSellerProfile(userId: string) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("account_type,seller_status,storage_quota_bytes")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return {
      profile: null,
      error: "Satıcı profili kontrol edilemedi: " + error.message,
    };
  }

  const currentProfile = (profile || {}) as SellerProfile;

  if (
    currentProfile.account_type === "admin" ||
    (currentProfile.account_type === "seller" &&
      currentProfile.seller_status === "approved")
  ) {
    return { profile: currentProfile, error: "" };
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      account_type: "seller",
      seller_status: "approved",
      seller_rejection_reason: null,
      seller_verified_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (updateError) {
    return {
      profile: currentProfile,
      error: "Satıcı hesabı etkinleştirilemedi: " + updateError.message,
    };
  }

  return {
    profile: {
      ...currentProfile,
      account_type: "seller",
      seller_status: "approved",
    },
    error: "",
  };
}
