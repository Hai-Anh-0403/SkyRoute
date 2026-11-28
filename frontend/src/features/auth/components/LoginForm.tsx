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
          className="h-12 w-full rounded-lg border border-[#0a0a0a]/20 bg-white px-3.5 text-base text-[#0a0a0a] outline-none focus:border-[#1f6b3a] focus:ring-3 focus:ring-[#1f6b3a]/15"
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
          className="mb-1.5 block text-sm font-medium text-[#0a0a0a]"
        >
          Mật khẩu
        </label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          {...register('password')}
          className="h-12 w-full rounded-lg border border-[#0a0a0a]/20 bg-white px-3.5 text-base text-[#0a0a0a] outline-none focus:border-[#1f6b3a] focus:ring-3 focus:ring-[#1f6b3a]/15"
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
        className="sr-btn-primary h-11 w-full rounded-lg px-4 text-base font-medium disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loginMutation.isPending ? 'Đang đăng nhập...' : 'Đăng nhập'}
      </button>

      <p className="text-center text-sm text-[#6a6a6a]">
        Chưa có tài khoản?{' '}
        <Link
          href={ROUTES.REGISTER}
          className="font-medium text-[#1f6b3a] hover:underline"
        >
          Đăng ký ngay
        </Link>
      </p>
    </form>
  );
}
