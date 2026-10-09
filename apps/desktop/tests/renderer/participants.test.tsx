import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Participants } from '../../src/renderer/components/Participants';

const p = (identity: string, name: string, isSpeaking = false, isLocal = false) => ({
  identity,
  name,
  isSpeaking,
  isLocal,
});

describe('Participants', () => {
  it('lista nomes e marca o usuário local', () => {
    render(<Participants participants={[p('1', 'Ana', false, true), p('2', 'Bia')]} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText(/Ana/)).toHaveTextContent('(você)');
  });
  it('atualiza ao entrar/sair e marca quem fala', () => {
    const { rerender } = render(<Participants participants={[p('1', 'Ana')]} />);
    rerender(<Participants participants={[p('1', 'Ana'), p('2', 'Bia', true)]} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByLabelText('falando')).toBeInTheDocument();
    rerender(<Participants participants={[p('2', 'Bia')]} />);
    expect(screen.queryByText(/Ana/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('falando')).not.toBeInTheDocument();
  });
});
