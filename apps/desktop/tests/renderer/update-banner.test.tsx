import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { installScreenShareMock } from '../setup';
import { UpdateBanner } from '../../src/renderer/components/UpdateBanner';

describe('UpdateBanner', () => {
  it('mostra aviso com link quando há versão nova', async () => {
    const sm = installScreenShareMock({
      checkForUpdate: vi
        .fn()
        .mockResolvedValue({ latest: '2.0.0', downloadUrl: 'https://x.com/a.exe' }),
    });
    render(<UpdateBanner />);
    expect(await screen.findByRole('alert')).toHaveTextContent('2.0.0');
    await userEvent.click(screen.getByRole('link', { name: 'Baixar' }));
    expect(sm.openExternal).toHaveBeenCalledWith('https://x.com/a.exe');
  });
  it('some quando está atualizado', async () => {
    const sm = installScreenShareMock({ checkForUpdate: vi.fn().mockResolvedValue(null) });
    render(<UpdateBanner />);
    await waitFor(() => expect(sm.checkForUpdate).toHaveBeenCalled());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
  it('some quando a checagem falha', async () => {
    const sm = installScreenShareMock({
      checkForUpdate: vi.fn().mockRejectedValue(new Error('x')),
    });
    render(<UpdateBanner />);
    await waitFor(() => expect(sm.checkForUpdate).toHaveBeenCalled());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
