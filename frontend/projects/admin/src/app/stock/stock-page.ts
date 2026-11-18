import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuContent, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { type StockLevel, TPipe } from 'shared';
import { formDialogConfig } from '../form-dialog';
import { StockFormDialog, type StockFormData, type StockFormMode } from './stock-form-dialog';
import { StockStore } from './stock-store';

/**
 * Expected quantity and sales today per variant, alerts on top. Tap a tracked row to count it,
 * an untracked one to turn tracking on; purchase and settings in the overflow menu.
 */
@Component({
  selector: 'app-stock-page',
  providers: [StockStore],
  imports: [
    MatButton,
    MatIcon,
    MatIconButton,
    MatMenu,
    MatMenuContent,
    MatMenuItem,
    MatMenuTrigger,
    NgTemplateOutlet,
    TPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './stock-page.html',
  styleUrl: './stock-page.scss',
})
export class StockPage {
  protected readonly store = inject(StockStore);
  private readonly dialog = inject(MatDialog);
  private readonly breakpoints = inject(BreakpointObserver);

  constructor() {
    void this.store.load();
  }

  protected name(l: StockLevel): string {
    return [l.item_name, l.variant_name].filter(Boolean).join(' · ');
  }

  protected open(mode: StockFormMode, level: StockLevel): void {
    const data: StockFormData = {
      mode,
      level,
      save: (v) => this.store.save(mode, level.variant_id, v),
    };
    this.dialog.open(
      StockFormDialog,
      formDialogConfig(data, this.breakpoints.isMatched(Breakpoints.XSmall)),
    );
  }
}
