import React from 'react';
import { Clipboard } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { useClipboardStore } from '../../stores/clipboardStore';

export const EmptyState: React.FC = () => {
  const { t } = useTranslation('clipboard');
  const { isMonitoring, startMonitoring } = useClipboardStore();

  return (
    <Card className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <Clipboard size={64} className="text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">{t('emptyState.noHistory')}</h3>
      {!isMonitoring ? (
        <>
          <p className="text-muted-foreground mb-4">{t('emptyState.clickToStart')}</p>
          <Button onClick={startMonitoring}>
            {t('actions.startMonitoring')}
          </Button>
        </>
      ) : (
        <p className="text-muted-foreground">{t('emptyState.copyToStart')}</p>
      )}
    </Card>
  );
};