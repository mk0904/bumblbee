import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MissionCards } from '../src/features/MissionCards.jsx';
afterEach(cleanup);
test('all mission records remain accessible through pages without a scrolling list', async () => {
  const user = userEvent.setup();
  render(
    <MissionCards
      missions={Array.from({ length: 7 }, (_, i) => ({
        id: `mission-${i}`,
        name: `Route ${i + 1}`,
        description: '',
        waypoints: [],
        revision: 1,
      }))}
      onEdit={vi.fn()}
      onStart={vi.fn()}
      onArchive={vi.fn()}
      onNew={vi.fn()}
    />,
  );
  expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(3);
  await user.click(screen.getByRole('button', { name: 'Next missions page' }));
  expect(screen.getByRole('heading', { name: 'Route 4' })).toBeTruthy();
  expect(screen.queryByRole('heading', { name: 'Route 1' })).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Next missions page' }));
  expect(screen.getByRole('heading', { name: 'Route 7' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Next missions page' }).disabled).toBe(true);
});
