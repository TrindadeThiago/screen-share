import { act, render, screen, waitFor } from '@testing-library/react';
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
  let roomApi: never;
  beforeEach(() => {
    roomApi = {
      joinRoom: vi.fn(),
      requestBroadcast: vi.fn().mockResolvedValue(undefined),
      releaseBroadcast: vi.fn().mockResolvedValue(undefined),
    } as never;
  });
  const startSharing = async (id = 'screen:0:0', name = 'Tela 1') => {
    const sm = installScreenShareMock({
      listSources: vi.fn().mockResolvedValue([
        {
          id,
          name,
          thumbnailDataUrl: 'data:x',
          kind: id.startsWith('screen') ? 'screen' : 'window',
        },
      ]),
    });
    render(<Room join={join} displayName="Ana" api={roomApi} onLeave={vi.fn()} />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Compartilhar tela' })).toBeEnabled(),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Compartilhar tela' }));
    await userEvent.click(await screen.findByRole('button', { name: new RegExp(name) }));
    await screen.findByRole('button', { name: 'Parar de compartilhar' });
    return sm;
  };
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
    expect(await screen.findByText(/vão se ouvir com eco/)).toBeInTheDocument();
    expect(sm.selectSource).toHaveBeenCalledWith('screen:0:0');
    expect(FakeRoom.last.localParticipant.setScreenShareEnabled).toHaveBeenCalled();
  });
  it('pede a vez ao servidor antes de transmitir e a devolve ao parar', async () => {
    await startSharing();
    expect((roomApi as any).requestBroadcast).toHaveBeenCalledWith(join.code, 't');
    await userEvent.click(screen.getByRole('button', { name: 'Parar de compartilhar' }));
    await waitFor(() =>
      expect((roomApi as any).releaseBroadcast).toHaveBeenCalledWith(join.code, 't'),
    );
  });
  it('janela não tem áudio: sem aviso de eco; mostra quantos assistem', async () => {
    await startSharing('window:1:0', 'Jogo');
    expect(screen.queryByText(/eco/)).toBeNull();
    expect(screen.getByTestId('watching')).toHaveTextContent('0 pessoas assistindo');
  });
  it('silenciar vozes ao transmitir a tela é opcional e fica salvo', async () => {
    const sm = await startSharing();
    await userEvent.click(screen.getByLabelText(/Silenciar as vozes/));
    expect(sm.setPreferences).toHaveBeenCalledWith({ muteVoicesWhileSharing: true });
  });
  it('trocar fonte para e recomeça a transmissão', async () => {
    await startSharing();
    const share = FakeRoom.last.localParticipant.setScreenShareEnabled;
    await userEvent.click(screen.getByRole('button', { name: 'Trocar fonte' }));
    await userEvent.click(await screen.findByRole('button', { name: /Tela 1/ }));
    await waitFor(() =>
      expect(share.mock.calls.map((c: unknown[]) => c[0])).toEqual([true, false, true]),
    );
  });
  it('avisa o app que está na sala, registra e copia o diagnóstico', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const sm = installScreenShareMock({ readDiagnostics: vi.fn().mockResolvedValue('linhas') });
    const { unmount } = render(
      <Room join={join} displayName="Ana" api={roomApi} onLeave={vi.fn()} />,
    );
    expect(sm.setInRoom).toHaveBeenCalledWith(true);
    await waitFor(() => expect(sm.logDiagnostic).toHaveBeenCalledWith('conexão: connected'));
    await userEvent.click(screen.getByRole('button', { name: 'Configurações' }));
    await userEvent.click(screen.getByRole('button', { name: 'Copiar diagnóstico' }));
    expect(writeText).toHaveBeenCalledWith('linhas');
    unmount();
    expect(sm.setInRoom).toHaveBeenLastCalledWith(false);
  });
  it('preferências ficam num diálogo só, sem trocar de servidor dentro da sala', async () => {
    const sm = installScreenShareMock();
    render(
      <Room join={join} displayName="Ana" api={roomApi} serverUrl="http://x" onLeave={vi.fn()} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Configurações' }));
    expect(screen.getByLabelText('Endereço do servidor')).toBeDisabled();
    await userEvent.selectOptions(screen.getByLabelText('Qualidade'), 'detail');
    expect(sm.setPreferences).toHaveBeenCalledWith({ preset: 'detail' });
    await userEvent.click(screen.getByLabelText(/Segurar V para falar/));
    expect(sm.setPreferences).toHaveBeenCalledWith({ pushToTalk: true });
  });
  it('o seletor abre em Telas e mostra as janelas na outra aba', async () => {
    installScreenShareMock({
      listSources: vi.fn().mockResolvedValue([
        { id: 'screen:0:0', name: 'Tela 1', thumbnailDataUrl: 'data:x', kind: 'screen' },
        { id: 'window:1:0', name: 'Jogo', thumbnailDataUrl: 'data:x', kind: 'window' },
      ]),
    });
    render(<Room join={join} displayName="Ana" api={roomApi} onLeave={vi.fn()} />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Compartilhar tela' })).toBeEnabled(),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Compartilhar tela' }));
    expect(await screen.findByRole('button', { name: /Tela 1/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Jogo/ })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Janelas' }));
    expect(screen.getByRole('button', { name: /Jogo/ })).toBeInTheDocument();
  });
  it('atalho global abre e fecha o microfone', async () => {
    let toggle = () => {};
    installScreenShareMock({
      onMicToggle: vi.fn((cb: () => void) => {
        toggle = cb;
        return () => {};
      }),
    });
    render(<Room join={join} displayName="Ana" api={roomApi} onLeave={vi.fn()} />);
    await screen.findByText('Conectado');
    const mic = FakeRoom.last.localParticipant.setMicrophoneEnabled;
    act(() => toggle());
    await waitFor(() => expect(mic).toHaveBeenLastCalledWith(true));
    expect(screen.getByLabelText(/Microfone aberto/)).toBeChecked();
    act(() => toggle());
    await waitFor(() => expect(mic).toHaveBeenLastCalledWith(false));
  });
});
