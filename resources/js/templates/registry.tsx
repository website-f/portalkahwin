import type { ComponentType } from 'react';
import type { TemplateProps } from './types';
import Floral from './Floral';
import Curtain from './Curtain';
import Khat from './Khat';
import Songket from './Songket';

export const TEMPLATE_COMPONENTS: Record<string, ComponentType<TemplateProps>> = {
    floral: Floral,
    curtain: Curtain,
    khat: Khat,
    songket: Songket,
};

export function getTemplate(key: string): ComponentType<TemplateProps> {
    return TEMPLATE_COMPONENTS[key] ?? Floral;
}
