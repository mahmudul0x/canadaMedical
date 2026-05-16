import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { api, apiError } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { Field, Input, SubmitButton } from "@/components/site/Form";

export const Route = createFileRoute("/admin/profile")({
  component: AdminProfilePage,
});

const profileSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email(),
});
type ProfileInput = z.infer<typeof profileSchema>;

const passwordSchema = z.object({
  current_password: z.string().min(1, "Required"),
  new_password: z.string().min(8, "At least 8 characters"),
  confirm_password: z.string().min(1, "Required"),
}).refine((d) => d.new_password === d.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
});
type PasswordInput = z.infer<typeof passwordSchema>;

function AdminProfilePage() {
  const qc = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["admin", "profile"],
    queryFn: async () => {
      const r = await api.get("/api/admin/profile/");
      return r.data?.data ?? r.data;
    },
  });

  const profileMutation = useMutation({
    mutationFn: (input: ProfileInput) => api.put("/api/admin/profile/", input),
    onSuccess: (res) => {
      const d = res.data?.data ?? res.data;
      setUser(d);
      qc.invalidateQueries({ queryKey: ["admin", "profile"] });
      toast.success("Profile updated");
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const passwordMutation = useMutation({
    mutationFn: ({ current_password, new_password }: { current_password: string; new_password: string }) =>
      api.post("/api/admin/profile/change-password/", { current_password, new_password }),
    onSuccess: () => toast.success("Password changed"),
    onError: (e) => toast.error(apiError(e)),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-4 lg:p-8">
        {[1, 2].map((i) => <div key={i} className="h-48 animate-pulse rounded-2xl border border-border bg-secondary" />)}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold text-primary">My Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your admin account details.</p>
      </div>

      <ProfileForm
        profile={profile}
        submitting={profileMutation.isPending}
        onSubmit={(v) => profileMutation.mutate(v)}
      />

      <PasswordForm
        submitting={passwordMutation.isPending}
        onSubmit={({ current_password, new_password }) => passwordMutation.mutate({ current_password, new_password })}
      />
    </div>
  );
}

function ProfileForm({ profile, onSubmit, submitting }: { profile: ProfileInput | null; onSubmit: (v: ProfileInput) => void; submitting?: boolean }) {
  const { register, handleSubmit, formState: { errors } } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: profile?.first_name ?? "",
      last_name: profile?.last_name ?? "",
      email: profile?.email ?? "",
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-base font-bold text-primary">Account Information</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First Name" required>
          <Input {...register("first_name")} />
          {errors.first_name && <p className="mt-1 text-xs text-destructive">{errors.first_name.message}</p>}
        </Field>
        <Field label="Last Name" required>
          <Input {...register("last_name")} />
          {errors.last_name && <p className="mt-1 text-xs text-destructive">{errors.last_name.message}</p>}
        </Field>
      </div>
      <Field label="Email" required>
        <Input type="email" {...register("email")} />
        {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
      </Field>
      <SubmitButton loading={submitting}>Save Changes</SubmitButton>
    </form>
  );
}

function PasswordForm({ onSubmit, submitting }: { onSubmit: (v: { current_password: string; new_password: string }) => void; submitting?: boolean }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<PasswordInput>({
    resolver: zodResolver(passwordSchema),
  });

  const [done, setDone] = useState(false);

  function handleChange(v: PasswordInput) {
    onSubmit({ current_password: v.current_password, new_password: v.new_password });
    reset();
    setDone(true);
    setTimeout(() => setDone(false), 5000);
  }

  return (
    <form onSubmit={handleSubmit(handleChange)} className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-base font-bold text-primary">Change Password</h2>
      {done && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          Password changed successfully.
        </div>
      )}
      <Field label="Current Password" required>
        <Input type="password" {...register("current_password")} />
        {errors.current_password && <p className="mt-1 text-xs text-destructive">{errors.current_password.message}</p>}
      </Field>
      <Field label="New Password" required>
        <Input type="password" {...register("new_password")} />
        {errors.new_password && <p className="mt-1 text-xs text-destructive">{errors.new_password.message}</p>}
      </Field>
      <Field label="Confirm New Password" required>
        <Input type="password" {...register("confirm_password")} />
        {errors.confirm_password && <p className="mt-1 text-xs text-destructive">{errors.confirm_password.message}</p>}
      </Field>
      <SubmitButton loading={submitting}>Change Password</SubmitButton>
    </form>
  );
}
