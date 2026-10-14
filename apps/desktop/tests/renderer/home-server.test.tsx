import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { installScreenShareMock } from '../setup';
import { Home } from '../../src/renderer/screens/Home';

beforeEach(() => void installScreenShareMock());

const setup = async (onChangeServer = vi.fn().mockResolvedValue(undefined)) => {
  render(
    <Home
      api={{} as never}
      serverUrl="https://api.example.com"
      onChangeServer={onChangeServer}
      onJoined={vi.fn()}
    />,
  );
  await userEvent.click(screen.getByRole('button', { name: 'Configurações' }));
  return onChangeServer;
};

describe('endereço do servidor', () => {
  it('mostra o endereço atual e deixa salvar só quando muda', async () => {
    await setup();
    const input = screen.getByLabelText('Endereço do servidor');
    expect(input).toHaveValue('https://api.example.com');
    expect(screen.getByRole('button', { name: 'Salvar servidor' })).toBeDisabled();
    await userEvent.clear(input);
    await userEvent.type(input, 'http://100.1.2.3:3000');
    expect(screen.getByRole('button', { name: 'Salvar servidor' })).toBeEnabled();
  });
  it('envia o novo endereço ao salvar', async () => {
    const on = await setup();
    const input = screen.getByLabelText('Endereço do servidor');
    await userEvent.clear(input);
    await userEvent.type(input, 'http://100.1.2.3:3000');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar servidor' }));
    expect(on).toHaveBeenCalledWith('http://100.1.2.3:3000');
  });
  it('mostra o erro quando o endereço é recusado', async () => {
    await setup(
      vi
        .fn()
        .mockRejectedValue(
          new Error("Error invoking remote method 'server:set': Error: Endereço inválido."),
        ),
    );
    const input = screen.getByLabelText('Endereço do servidor');
    await userEvent.clear(input);
    await userEvent.type(input, 'ftp://x');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar servidor' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Endereço inválido.'));
    expect(screen.getByRole('alert')).not.toHaveTextContent('Error invoking');
  });
});
