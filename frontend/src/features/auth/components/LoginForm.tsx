'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ROUTES } from '@/shared/lib/routes';
import { useLogin } from '../hooks/useAuthMutations';

const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const loginMutation = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = (values: LoginFormValues) => {
    loginMutation.mutate(values);
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="space-y-4"
      aria-label="Biểu mẫu đăng nhập"
    >
      <div>
        <label
          htmlFor="login-email"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Email
        </label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          placeholder="traveler@skyroute.vn"
          {...register('email')}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
        />
        {errors.email && (
          <p role="alert" className="mt-1 text-xs text-rose-600">
            {errors.email.message}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="login-password"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Mật khẩu
        </label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          {...register('password')}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
        />
        {errors.password && (
          <p role="alert" className="mt-1 text-xs text-rose-600">
            {errors.password.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={loginMutation.isPending}
        className="w-full rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loginMutation.isPending ? 'Đang đăng nhập...' : 'Đăng nhập'}
      </button>

      <p className="text-center text-sm text-slate-600">
        Chưa có tài khoản?{' '}
        <Link
          href={ROUTES.REGISTER}
          className="font-medium text-sky-600 hover:underline"
        >
          Đăng ký ngay
        </Link>
      </p>
    </form>
  );
}
