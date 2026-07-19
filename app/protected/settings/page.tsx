import {
  ChangePasswordForm,
  DeleteAccountForm,
} from "@/components/settings-forms";

export default function SettingsPage() {
  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account security and participation preferences.
        </p>
      </div>

      <ChangePasswordForm />
      <DeleteAccountForm />
    </div>
  );
}
