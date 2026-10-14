import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { installScreenShareMock } from '../setup';
import { ApiError } from '../../src/renderer/api/client';
import { Home } from '../../src/renderer/screens/Home';

const join = { code: 'ABCD', serverUrl: 'wss://x', token: 't', expiresAt: '' };

async function fill(code: string) {
  await userEvent.type(screen.getByLabelText('Seu nome'), 'Bia');
  await userEvent.type(screen.getByLabelText('Código da sala'), code);
}

beforeEach(() => void installScreenShareMock());

describe('entrar em sala', () => {
  it('aceita código colado com espaços/minúsculas e repassa ao cliente', async () => {
    const a = { joinRoom: vi.fn().mockResolvedValue(join) };
    const onJoined = vi.fn();
    render(
      <Home
        api={a as never}
        serverUrl="https://api.example.com"
        onChangeServer={vi.fn()}
        onJoined={onJoined}
      />,
    );
    await fill('  abcd efgh  ');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    await waitFor(() => expect(onJoined).toHaveBeenCalled());
    expect(a.joinRoom).toHaveBeenCalledWith('  abcd efgh  ', { displayName: 'Bia' });
  });
  it.each([
    ['room_not_found', 'Sala não encontrada.'],
    ['wrong_password', 'Senha incorreta.'],
    ['room_full', 'A sala está lotada.'],
    ['room_expired', 'Esta sala expirou.'],
  ] as const)('mostra mensagem para %s e permite tentar de novo', async (code, msg) => {
    const joinRoom = vi
      .fn()
      .mockRejectedValueOnce(new ApiError(code, msg))
      .mockResolvedValueOnce(join);
    const onJoined = vi.fn();
    render(
      <Home
        api={{ joinRoom } as never}
        serverUrl="https://api.example.com"
        onChangeServer={vi.fn()}
        onJoined={onJoined}
      />,
    );
    await fill('abcd');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(msg);
    expect(onJoined).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    await waitFor(() => expect(onJoined).toHaveBeenCalled());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
  it('erro desconhecido mostra mensagem genérica', async () => {
    render(
      <Home
        api={{ joinRoom: vi.fn().mockRejectedValue(new Error('x')) } as never}
        serverUrl="https://api.example.com"
        onChangeServer={vi.fn()}
        onJoined={vi.fn()}
      />,
    );
    await fill('abcd');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Algo deu errado');
  });
  it('preenche o nome usado da última vez e grava o novo ao entrar', async () => {
    const sm = installScreenShareMock({
      getPreferences: vi.fn().mockResolvedValue({ displayName: 'Bia' }),
    });
    const a = { joinRoom: vi.fn().mockResolvedValue(join) };
    render(
      <Home
        api={a as never}
        serverUrl="https://api.example.com"
        onChangeServer={vi.fn()}
        onJoined={vi.fn()}
      />,
    );
    const name = screen.getByLabelText('Seu nome');
    await waitFor(() => expect(name).toHaveValue('Bia'));
    await userEvent.clear(name);
    await userEvent.type(name, 'Bianca');
    await userEvent.type(screen.getByLabelText('Código da sala'), 'abcd');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    await waitFor(() => expect(sm.setPreferences).toHaveBeenCalledWith({ displayName: 'Bianca' }));
  });
});
