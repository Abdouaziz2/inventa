import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import AppLayout from '@/components/AppLayout';

vi.mock('@/components/AppSidebar', () => ({
  default: () => <aside data-testid="sidebar-mock" />,
}));

vi.mock('@/components/AppHeader', () => ({
  default: () => <header data-testid="header-mock" />,
}));

vi.mock('@/components/NetworkStatus', () => ({
  default: () => null,
}));

describe('AppLayout', () => {
  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      configurable: true,
      value: vi.fn(),
    });
  });

  it('keeps navigation outside the independently scrollable main content', () => {
    render(
      <MemoryRouter
        initialEntries={['/dashboard']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<div>Dashboard content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('app-shell')).toHaveClass('h-dvh', 'overflow-hidden');
    expect(screen.getByTestId('app-content-column')).toHaveClass(
      'h-full',
      'min-h-0',
      'overflow-hidden',
    );
    expect(screen.getByTestId('main-content')).toHaveClass(
      'min-h-0',
      'overflow-y-auto',
      'overflow-x-hidden',
    );
    expect(screen.getByTestId('sidebar-mock')).not.toBe(
      screen.getByTestId('main-content'),
    );
    expect(screen.getByTestId('header-mock')).not.toBe(
      screen.getByTestId('main-content'),
    );
  });
});
