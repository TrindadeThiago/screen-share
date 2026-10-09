import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeRoom } from './fakeLivekit';
import { installScreenShareMock } from '../setup';

vi.mock('livekit-client', async () => (await import('./fakeLivekit')).livekitModule);
import { Home } from '../../src/renderer/screens/Home';
import { Room } from '../../src/renderer/screens/Room';

const join = { code: 'ABCD-EFGH-IJKL-MNOP', serverUrl: 'wss://x', token: 't', expiresAt: '' };
const api = (over = {}) => ({
  createRoom: vi.fn().mockResolvedValue(join),
  joinRoom: vi.fn(),
  getVersion: vi.fn(),
  ...over,
});

beforeEach(() => {
  FakeRoom.reset();
  installScreenShareMock();
});

describe('criar sala', () => {
  it('chama o cliente com o nome e entrega o resultado', async () => {
    const a = api();
    const onJoined = vi.fn();
    render(
      <Home
        api={a as never}
        serverUrl="https://api.example.com"
        onChangeServer={vi.fn()}
        onJoined={onJoined}
      />,
    );
    await userEvent.type(screen.getByLabelText('Seu nome'), '  Ana ');
    await userEvent.click(screen.getByRole('button', { name: 'Criar sala' }));
    await waitFor(() => expect(onJoined).toHaveBeenCalledWith(join, 'Ana', undefined));
    expect(a.createRoom).toHaveBeenCalledWith(expect.objectContaining({ displayName: 'Ana' }));
  });
  it('exige nome', async () => {
    const a = api();
    render(
      <Home
        api={a as never}
        serverUrl="https://api.example.com"
        onChangeServer={vi.fn()}
        onJoined={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Criar sala' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Informe seu nome');
    expect(a.createRoom).not.toHaveBeenCalled();
  });
  it('envia opções de senha, limite e expiração', async () => {
    const a = api();
    render(
      <Home
        api={a as never}
        serverUrl="https://api.example.com"
        onChangeServer={vi.fn()}
        onJoined={vi.fn()}
      />,
    );
    await userEvent.type(screen.getByLabelText('Seu nome'), 'Ana');
    await userEvent.click(screen.getByRole('button', { name: 'Opções da sala' }));
    await userEvent.type(screen.getByLabelText('Senha (opcional)'), 'segredo1');
    await userEvent.click(screen.getByRole('button', { name: 'Criar sala' }));
    await waitFor(() =>
      expect(a.createRoom).toHaveBeenCalledWith({
        displayName: 'Ana',
        password: 'segredo1',
        maxParticipants: 10,
        expiresInMinutes: 720,
      }),
    );
  });
});

describe('tela da sala (transmissor)', () => {
  const roomApi = { joinRoom: vi.fn() } as never;
  it('mostra o código com botão de copiar', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<Room join={join} displayName="Ana" api={roomApi} onLeave={vi.fn()} />);
    expect(screen.getByTestId('room-code')).toHaveTextContent(join.code);
    await userEvent.click(screen.getByRole('button', { name: 'Copiar código' }));
    expect(writeText).toHaveBeenCalledWith(join.code);
  });
  it('avisa sobre eco enquanto transmite', async () => {
    const sm = installScreenShareMock({
      listSources: vi
        .fn()
        .mockResolvedValue([
          { id: 'screen:0:0', name: 'Tela 1', thumbnailDataUrl: 'data:x', kind: 'screen' },
        ]),
    });
    render(<Room join={join} displayName="Ana" api={roomApi} onLeave={vi.fn()} />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Compartilhar tela' })).toBeEnabled(),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Compartilhar tela' }));
    await userEvent.click(await screen.findByRole('button', { name: /Tela 1/ }));
    expect(await screen.findByText(/fone de ouvido/)).toBeInTheDocument();
    expect(sm.selectSource).toHaveBeenCalledWith('screen:0:0');
    expect(FakeRoom.last.localParticipant.setScreenShareEnabled).toHaveBeenCalled();
  });
});
