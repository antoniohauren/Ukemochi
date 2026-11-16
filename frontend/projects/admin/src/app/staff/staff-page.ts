import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuContent, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { type StaffUser, TPipe } from 'shared';
import { roleKey, StaffFormDialog, type StaffFormData } from './staff-form-dialog';
import { StaffStore } from './staff-store';

/** Staff list; tap a row to edit, overflow menu to reset the PIN. */
@Component({
  selector: 'app-staff-page',
  providers: [StaffStore],
  imports: [
    MatButton,
    MatIcon,
    MatIconButton,
    MatMenu,
    MatMenuContent,
    MatMenuItem,
    MatMenuTrigger,
    TPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './staff-page.html',
  styleUrl: './staff-page.scss',
})
export class StaffPage {
  protected readonly store = inject(StaffStore);
  private readonly dialog = inject(MatDialog);
  private readonly breakpoints = inject(BreakpointObserver);
  protected readonly roleKey = roleKey;

  constructor() {
    void this.store.load();
  }

  protected edit(user: StaffUser | null): void {
    this.open({
      mode: user ? 'edit' : 'create',
      value: user ?? {},
      save: (v) => this.store.save(user?.id ?? null, v),
    });
  }

  protected resetPin(user: StaffUser): void {
    this.open({ mode: 'pin', save: (v) => this.store.resetPin(user.id, v) });
  }

  private open(data: StaffFormData): void {
    const fullScreen = this.breakpoints.isMatched(Breakpoints.XSmall);
    this.dialog.open(StaffFormDialog, {
      data,
      ...(fullScreen
        ? { width: '100vw', maxWidth: '100vw', height: '100%', panelClass: 'full-screen-dialog' }
        : { width: '480px' }),
    });
  }
}
