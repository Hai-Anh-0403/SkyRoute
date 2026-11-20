'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ROUTES } from '@/shared/lib/routes';
import { useRegister } from '../hooks/useAuthMutations';

const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Họ tên phải có ít nhất 2 ký tự'),
  email: z.string().email('Email không hợp lệ'),
  password: z
    .string()
    .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
    .max(72, 'Mật khẩu tối đa 72 ký tự'),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const registerMutation = useRegister();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', password: '' },
  });

  const onSubmit = (values: RegisterFormValues) => {
    registerMutation.mutate(values);
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="space-y-4"
      aria-label="Biểu mẫu đăng ký"
    >
      <div>
        <label
          htmlFor="register-full-name"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Họ và tên
        </label>
        <input
          id="register-full-name"
          type="text"
          autoComplete="name"
          placeholder="Nguyễn Văn A"
          {...register('fullName')}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
        />
        {errors.fullName && (
          <p role="alert" className="mt-1 text-xs text-rose-600">
            {errors.fullName.message}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="register-email"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Email
        </label>
        <input
          id="register-email"
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
          htmlFor="register-password"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Mật khẩu
        </label>
        <input
          id="register-password"
          type="password"
          autoComplete="new-password"
          placeholder="Tối thiểu 8 ký tự"
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
        disabled={registerMutation.isPending}
        className="w-full rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {registerMutation.isPending ? 'Đang tạo tài khoản...' : 'Đăng ký'}
      </button>

      <p className="text-center text-sm text-slate-600">
        Đã có tài khoản?{' '}
        <Link
          href={ROUTES.LOGIN}
          className="font-medium text-sky-600 hover:underline"
        >
          Đăng nhập
        </Link>
      </p>
    </form>
  );
}
