import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { installScreenShareMock } from '../setup';
import { App } from '../../src/renderer/App';
import { ApiError } from '../../src/renderer/api/client';
import { Home } from '../../src/renderer/screens/Home';

describe('tela inicial de servidor', () => {
  it('aparece quando nenhum servidor foi definido e salva a chave antes do endereço', async () => {
    const sm = installScreenShareMock({ isServerConfigured: vi.fn().mockResolvedValue(false) });
    render(<App />);
    await userEvent.type(await screen.findByLabelText('Endereço do servidor'), '100.1.2.3:3000');
    await userEvent.type(screen.getByLabelText(/Chave para criar salas/), 'segredo');
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    await waitFor(() => expect(sm.setServerUrl).toHaveBeenCalledWith('100.1.2.3:3000'));
    expect(sm.setServerKey).toHaveBeenCalledWith('segredo');
    expect(sm.setServerKey.mock.invocationCallOrder[0]).toBeLessThan(
      sm.setServerUrl.mock.invocationCallOrder[0]!,
    );
  });
  it('chave em branco não é salva; erro do main aparece sem o prefixo do Electron', async () => {
    const sm = installScreenShareMock({
      isServerConfigured: vi.fn().mockResolvedValue(false),
      setServerUrl: vi
        .fn()
        .mockRejectedValue(
          new Error("Error invoking remote method 'server:set': Error: Não foi possível falar."),
        ),
    });
    render(<App />);
    await userEvent.type(await screen.findByLabelText('Endereço do servidor'), 'x.com');
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/^Não foi possível falar\.$/);
    expect(sm.setServerKey).not.toHaveBeenCalled();
  });
  it('com servidor definido, vai direto para a tela de salas', async () => {
    installScreenShareMock();
    render(<App />);
    expect(await screen.findByRole('button', { name: 'Criar sala' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Continuar' })).toBeNull();
  });
});

describe('chave do servidor', () => {
  const join = { code: 'ABCD', serverUrl: 'wss://x', token: 't', expiresAt: '' };

  it('pede a chave quando o servidor exige e tenta de novo com ela', async () => {
    installScreenShareMock();
    const createRoom = vi
      .fn()
      .mockRejectedValueOnce(new ApiError('server_key_required', 'Este servidor exige uma chave.'))
      .mockResolvedValue(join);
    const onChangeKey = vi.fn().mockResolvedValue(undefined);
    const onJoined = vi.fn();
    render(
      <Home
        api={{ createRoom } as never}
        serverUrl="https://api.example.com"
        onChangeServer={vi.fn()}
        onChangeKey={onChangeKey}
        onJoined={onJoined}
      />,
    );
    await userEvent.type(screen.getByLabelText('Seu nome'), 'Ana');
    await userEvent.click(screen.getByRole('button', { name: 'Criar sala' }));
    await userEvent.type(await screen.findByLabelText('Chave para criar salas'), 'segredo');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar chave e criar sala' }));
    await waitFor(() => expect(onJoined).toHaveBeenCalledWith(join, 'Ana', undefined));
    expect(onChangeKey).toHaveBeenCalledWith('segredo');
    expect(createRoom).toHaveBeenLastCalledWith(expect.anything(), 'segredo');
  });
  it('salva e remove a chave nas configurações', async () => {
    installScreenShareMock();
    const onChangeKey = vi.fn().mockResolvedValue(undefined);
    render(
      <Home
        api={{} as never}
        serverUrl="https://api.example.com"
        onChangeServer={vi.fn()}
        hasServerKey
        onChangeKey={onChangeKey}
        onJoined={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Configurações' }));
    const input = screen.getByLabelText('Chave para criar salas');
    expect(input).toHaveAttribute('placeholder', 'Configurada');
    expect(screen.getByRole('button', { name: 'Salvar chave' })).toBeDisabled();
    await userEvent.type(input, 'nova');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar chave' }));
    expect(onChangeKey).toHaveBeenCalledWith('nova');
    expect(await screen.findByText('Chave salva.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Remover' }));
    expect(onChangeKey).toHaveBeenLastCalledWith(null);
  });
});
