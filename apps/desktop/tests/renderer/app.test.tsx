import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { installScreenShareMock } from '../setup';
import { App } from '../../src/renderer/App';

describe('App', () => {
  it('carrega o endereço do servidor antes de mostrar a tela inicial', async () => {
    const sm = installScreenShareMock({
      getServerUrl: vi.fn().mockResolvedValue('http://100.1.2.3:3000'),
    });
    render(<App />);
    expect(screen.getByRole('status')).toHaveTextContent('Carregando');
    await userEvent.click(await screen.findByRole('button', { name: 'Configurações' }));
    expect(screen.getByLabelText('Endereço do servidor')).toHaveValue('http://100.1.2.3:3000');
    expect(sm.getServerUrl).toHaveBeenCalled();
  });
});
