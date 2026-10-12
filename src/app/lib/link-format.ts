export type LinkType = 'url' | 'html' | 'markdown' | 'bbCode';

/** 文件在站内的访问路径，对每一段做 URL 编码，避免文件名里的特殊字符破坏链接 */
export function filePath(path: string): string {
  return '/file/' + path.split('/').map(encodeURIComponent).join('/');
}

export function formatLink(type: LinkType, link: string, filename: string): string {
  switch (type) {
    case 'url':
      return link;
    case 'html':
      return `<img src="${link}" alt="${filename}" />`;
    case 'bbCode':
      return `[img]${link}[/img]`;
    case 'markdown':
      return `![${filename}](${link})`;
    default:
      return link;
  }
}
